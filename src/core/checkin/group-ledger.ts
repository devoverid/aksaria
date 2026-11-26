import type { Prisma, PrismaClient, TelegramCheckin } from '@generatedDB/client'
import type { CheckinStatusType } from './policy'
import { addDays, countConsecutiveDays, dayKey, STREAK_MILESTONES, wibDay } from './policy'

const CHECKIN_REFERENCE_PREFIX = 'TG-'
const MAX_POSTGRES_INT = 2_147_483_647

export type TelegramProofKind = 'PHOTO' | 'DOCUMENT'

export function checkinReference(sourceMessageId: number): string {
    return `${CHECKIN_REFERENCE_PREFIX}${sourceMessageId.toString(36).toUpperCase()}`
}

export function parseCheckinReference(reference: string): number | null {
    if (!reference.startsWith(CHECKIN_REFERENCE_PREFIX))
        return null

    const body = reference.slice(CHECKIN_REFERENCE_PREFIX.length)
    if (!/^[0-9A-Z]+$/.test(body))
        return null

    const sourceMessageId = Number.parseInt(body, 36)
    if (!Number.isSafeInteger(sourceMessageId) || sourceMessageId <= 0 || sourceMessageId > MAX_POSTGRES_INT)
        return null
    if (sourceMessageId.toString(36).toUpperCase() !== body)
        return null

    return sourceMessageId
}

type Reader = PrismaClient | Prisma.TransactionClient

async function lockParticipant(reader: Reader, chatId: string, userId: string): Promise<void> {
    await reader.telegramParticipant.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId },
        update: {},
    })

    await reader.$queryRaw`SELECT 1 FROM "TelegramParticipant" WHERE "chatId" = ${chatId} AND "userId" = ${userId} FOR UPDATE`
}

function isUniqueViolation(err: unknown): boolean {
    if (typeof err !== 'object' || err === null || !('code' in err))
        return false

    return err.code === 'P2002'
}

export async function getCheckinBySource(reader: Reader, chatId: string, sourceMessageId: number): Promise<TelegramCheckin | null> {
    return reader.telegramCheckin.findUnique({
        where: { chatId_sourceMessageId: { chatId, sourceMessageId } },
    })
}

export async function findCheckinByReference(reader: Reader, chatId: string, reference: string): Promise<TelegramCheckin | null> {
    const sourceMessageId = parseCheckinReference(reference)
    if (sourceMessageId === null)
        return null

    return getCheckinBySource(reader, chatId, sourceMessageId)
}

export async function getLatestForDay(reader: Reader, chatId: string, userId: string, day: Date): Promise<TelegramCheckin | null> {
    return reader.telegramCheckin.findFirst({
        where: { chatId, userId, day },
        orderBy: [{ createdAt: 'desc' }, { sourceMessageId: 'desc' }],
    })
}

export async function getApprovedDays(reader: Reader, chatId: string, userId: string, endDay: Date): Promise<Date[]> {
    const rows = await reader.telegramCheckin.findMany({
        where: { chatId, userId, status: 'APPROVED', day: { lte: endDay } },
        select: { day: true },
        orderBy: { day: 'desc' },
    })

    const unique = new Map<number, Date>()
    for (const row of rows) {
        const key = dayKey(row.day)
        if (!unique.has(key))
            unique.set(key, row.day)
    }

    return [...unique.values()]
}

export async function getPriorAttempt(reader: Reader, checkin: TelegramCheckin): Promise<TelegramCheckin | null> {
    return reader.telegramCheckin.findFirst({
        where: {
            chatId: checkin.chatId,
            userId: checkin.userId,
            OR: [
                { createdAt: { lt: checkin.createdAt } },
                { createdAt: checkin.createdAt, sourceMessageId: { lt: checkin.sourceMessageId } },
            ],
        },
        orderBy: [{ createdAt: 'desc' }, { sourceMessageId: 'desc' }],
    })
}

export async function getTodayWaiting(reader: Reader, chatId: string, day: Date, limit?: number): Promise<TelegramCheckin[]> {
    return reader.telegramCheckin.findMany({
        where: { chatId, day, status: 'WAITING' },
        orderBy: [{ createdAt: 'asc' }, { sourceMessageId: 'asc' }],
        ...(limit === undefined ? {} : { take: limit }),
    })
}

export async function countTodayWaiting(reader: Reader, chatId: string, day: Date): Promise<number> {
    return reader.telegramCheckin.count({ where: { chatId, day, status: 'WAITING' } })
}

export interface SubmitCheckinInput {
    chatId: string
    userId: string
    sourceMessageId: number
    day: Date
    description: string
    createdAt: Date
    proofKind?: TelegramProofKind | null
    proofFileId?: string | null
}

export type SubmitCheckinResult =
    | { type: 'CREATED'; checkin: TelegramCheckin; isFirst: boolean }
    | { type: 'DUPLICATE'; checkin: TelegramCheckin }
    | { type: 'ALREADY_SUBMITTED'; checkin: TelegramCheckin }

export async function submitCheckin(prisma: PrismaClient, input: SubmitCheckinInput): Promise<SubmitCheckinResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            await lockParticipant(tx, input.chatId, input.userId)

            const duplicate = await getCheckinBySource(tx, input.chatId, input.sourceMessageId)
            if (duplicate)
                return { type: 'DUPLICATE', checkin: duplicate }

            const existing = await tx.telegramCheckin.findFirst({
                where: {
                    chatId: input.chatId,
                    userId: input.userId,
                    day: input.day,
                    status: { not: 'REJECTED' },
                },
                orderBy: [{ createdAt: 'desc' }, { sourceMessageId: 'desc' }],
            })
            if (existing)
                return { type: 'ALREADY_SUBMITTED', checkin: existing }

            const checkin = await tx.telegramCheckin.create({
                data: {
                    chatId: input.chatId,
                    userId: input.userId,
                    sourceMessageId: input.sourceMessageId,
                    day: input.day,
                    description: input.description,
                    createdAt: input.createdAt,
                    proofKind: input.proofKind ?? null,
                    proofFileId: input.proofFileId ?? null,
                },
            })

            const isFirst = (await tx.telegramCheckin.count({
                where: { chatId: input.chatId, userId: input.userId },
            })) === 1

            return { type: 'CREATED', checkin, isFirst }
        })
    }
    catch (err) {
        if (!isUniqueViolation(err))
            throw err

        const duplicate = await getCheckinBySource(prisma, input.chatId, input.sourceMessageId)
        if (duplicate)
            return { type: 'DUPLICATE', checkin: duplicate }

        const existing = await prisma.telegramCheckin.findFirst({
            where: {
                chatId: input.chatId,
                userId: input.userId,
                day: input.day,
                status: { not: 'REJECTED' },
            },
            orderBy: [{ createdAt: 'desc' }, { sourceMessageId: 'desc' }],
        })
        if (existing)
            return { type: 'ALREADY_SUBMITTED', checkin: existing }

        throw err
    }
}

export async function recordReceipt(prisma: PrismaClient, chatId: string, sourceMessageId: number, receiptMessageId: number): Promise<void> {
    await prisma.telegramCheckin.update({
        where: { chatId_sourceMessageId: { chatId, sourceMessageId } },
        data: { receiptMessageId },
    })
}

export interface ParticipantState {
    chatId: string
    userId: string
    dmStartedAt: Date | null
    lastLossDay: Date | null
}

export async function getParticipant(reader: Reader, chatId: string, userId: string): Promise<ParticipantState | null> {
    return reader.telegramParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
        select: { chatId: true, userId: true, dmStartedAt: true, lastLossDay: true },
    })
}

export async function recordDmOptIn(prisma: PrismaClient, chatId: string, userId: string, at: Date): Promise<void> {
    await prisma.telegramParticipant.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId, dmStartedAt: at },
        update: { dmStartedAt: at },
    })
}

export interface ReviewCheckinInput {
    chatId: string
    reference: string
    reviewerId: string
    decision: Exclude<CheckinStatusType, 'WAITING'>
    comment: string | null
    now: Date
    audit: boolean
}

export type ReviewCheckinResult =
    | { type: 'APPROVED' | 'REJECTED'; checkin: TelegramCheckin; streak: number | null; milestone: number | null }
    | { type: 'NOT_FOUND' }
    | { type: 'NOT_WAITING' }
    | { type: 'NOT_TODAY' }
    | { type: 'NOT_OLDEST'; oldestReference: string }

export async function reviewCheckin(prisma: PrismaClient, input: ReviewCheckinInput): Promise<ReviewCheckinResult> {
    const sourceMessageId = parseCheckinReference(input.reference)
    if (sourceMessageId === null)
        return { type: 'NOT_FOUND' }

    return prisma.$transaction(async (tx) => {
        const found = await getCheckinBySource(tx, input.chatId, sourceMessageId)
        if (!found)
            return { type: 'NOT_FOUND' }

        await lockParticipant(tx, input.chatId, found.userId)

        const checkin = await getCheckinBySource(tx, input.chatId, sourceMessageId)
        if (!checkin)
            return { type: 'NOT_FOUND' }
        if (checkin.status !== 'WAITING')
            return { type: 'NOT_WAITING' }

        const today = wibDay(input.now)
        if (input.audit) {
            if (dayKey(checkin.day) >= dayKey(today))
                return { type: 'NOT_TODAY' }

            const oldest = await tx.telegramCheckin.findFirst({
                where: { chatId: input.chatId, userId: checkin.userId, status: 'WAITING' },
                orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { sourceMessageId: 'asc' }],
            })
            if (oldest && oldest.sourceMessageId !== checkin.sourceMessageId)
                return { type: 'NOT_OLDEST', oldestReference: checkinReference(oldest.sourceMessageId) }
        }
        else if (dayKey(checkin.day) !== dayKey(today)) {
            return { type: 'NOT_TODAY' }
        }

        const updated = await tx.telegramCheckin.update({
            where: { chatId_sourceMessageId: { chatId: input.chatId, sourceMessageId } },
            data: {
                status: input.decision,
                reviewedBy: input.reviewerId,
                reviewedAt: input.now,
                comment: input.comment,
            },
        })

        let streak: number | null = null
        let milestone: number | null = null
        if (input.decision === 'APPROVED') {
            const approvedDays = await getApprovedDays(tx, input.chatId, checkin.userId, checkin.day)
            streak = countConsecutiveDays(approvedDays, checkin.day)
            milestone = (STREAK_MILESTONES as readonly number[]).includes(streak) ? streak : null
        }

        return { type: input.decision, checkin: updated, streak, milestone }
    })
}

export async function claimLossNotices(prisma: PrismaClient, chatId: string, day: Date): Promise<string[]> {
    const twoDaysAgo = addDays(day, -2)
    const yesterday = addDays(day, -1)

    const candidates = await prisma.telegramCheckin.findMany({
        where: { chatId, day: twoDaysAgo, status: 'APPROVED' },
        select: { userId: true },
        distinct: ['userId'],
    })
    const approvedYesterday = new Set(
        (await prisma.telegramCheckin.findMany({
            where: { chatId, day: yesterday, status: 'APPROVED' },
            select: { userId: true },
            distinct: ['userId'],
        })).map(row => row.userId),
    )

    const claimed: string[] = []

    for (const { userId } of candidates) {
        if (approvedYesterday.has(userId))
            continue

        const didClaim = await prisma.$transaction(async (tx) => {
            await lockParticipant(tx, chatId, userId)

            const approvedBefore = await tx.telegramCheckin.findFirst({
                where: { chatId, userId, day: twoDaysAgo, status: 'APPROVED' },
            })
            if (!approvedBefore)
                return false

            const approvedSince = await tx.telegramCheckin.findFirst({
                where: { chatId, userId, day: yesterday, status: 'APPROVED' },
            })
            if (approvedSince)
                return false

            const participant = await tx.telegramParticipant.findUnique({
                where: { chatId_userId: { chatId, userId } },
                select: { lastLossDay: true },
            })
            if (participant?.lastLossDay && dayKey(participant.lastLossDay) === dayKey(day))
                return false

            await tx.telegramParticipant.update({
                where: { chatId_userId: { chatId, userId } },
                data: { lastLossDay: day },
            })

            return true
        })

        if (didClaim)
            claimed.push(userId)
    }

    return claimed
}
