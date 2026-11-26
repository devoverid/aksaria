import { afterAll, expect, test } from 'bun:test'
import { PrismaClient } from '@generatedDB/client'
import {
    checkinReference,
    claimLossNotices,
    countTodayWaiting,
    getApprovedDays,
    getCheckinBySource,
    getLatestForDay,
    getTodayWaiting,
    recordDmOptIn,
    reviewCheckin,
    submitCheckin,
} from './group-ledger'
import { addDays, countConsecutiveDays, wibDay } from './policy'
import type { TelegramDeps } from '../../telegram/deps'
import { runLossNotices, runReviewerReminder, type TelegramJobsApi } from '../../telegram/jobs'

const prisma = new PrismaClient()

afterAll(async () => {
    await prisma.$disconnect()
})

let counter = 0

function newChatId(): string {
    counter++
    return `-100${String(Date.now()).slice(-9)}${String(counter).padStart(2, '0')}`
}

function makeDeps(chatId: string, now: Date): TelegramDeps {
    return {
        prisma,
        chatId,
        botId: 999_000,
        botUsername: 'aksaria_test_bot',
        memberTag: 'Grinder',
        now: () => now,
    }
}

function makeApi(members: Record<string, string> = {}): { api: TelegramJobsApi, messages: Array<[string | number, string]> } {
    const messages: Array<[string | number, string]> = []
    const api = {
        sendMessage: async (chatId: string | number, text: string) => {
            messages.push([chatId, text])
            return { message_id: messages.length }
        },
        getChatMember: async (_chatId: string | number, userId: number) => ({
            status: members[String(userId)] ?? 'member',
            user: { id: userId, is_bot: false, first_name: 'Member' },
            is_member: true,
        }),
    } as unknown as TelegramJobsApi

    return { api, messages }
}

async function submit(chatId: string, userId: string, sourceMessageId: number, day: Date, description = 'exercise') {
    return submitCheckin(prisma, {
        chatId,
        userId,
        sourceMessageId,
        day,
        description,
        createdAt: new Date(day.getTime() + 3_600_000),
        proofKind: 'PHOTO',
        proofFileId: `photo-${sourceMessageId}`,
    })
}

test('wibDay uses the Jakarta date regardless of process timezone', () => {
    expect(wibDay(new Date('2026-11-26T16:59:59Z')).toISOString()).toBe('2026-11-26T00:00:00.000Z')
    expect(wibDay(new Date('2026-11-26T17:00:00Z')).toISOString()).toBe('2026-11-27T00:00:00.000Z')
})

test('concurrent distinct submissions by one user per day create one waiting row', async () => {
    const chatId = newChatId()
    const userId = '1001'
    const day = wibDay(new Date('2026-11-20T10:00:00Z'))

    const results = await Promise.all([
        submit(chatId, userId, 1001, day),
        submit(chatId, userId, 1002, day),
    ])

    expect(results.map(result => result.type).sort()).toEqual(['ALREADY_SUBMITTED', 'CREATED'])

    const rows = await prisma.telegramCheckin.findMany({ where: { chatId, userId } })
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('WAITING')
})

test('replaying the same source returns the stored row', async () => {
    const chatId = newChatId()
    const userId = '1002'
    const day = wibDay(new Date('2026-11-20T10:00:00Z'))

    const first = await submit(chatId, userId, 2001, day)
    const second = await submit(chatId, userId, 2001, day)

    expect(first.type).toBe('CREATED')
    expect(second.type).toBe('DUPLICATE')
    if (second.type === 'DUPLICATE')
        expect(second.checkin.sourceMessageId).toBe(2001)
    expect(await prisma.telegramCheckin.count({ where: { chatId, userId } })).toBe(1)
})

test('a rejected attempt can be replaced on the same day', async () => {
    const chatId = newChatId()
    const userId = '1003'
    const day = wibDay(new Date('2026-11-20T10:00:00Z'))

    const first = await submit(chatId, userId, 3001, day)
    expect(first.type).toBe('CREATED')

    const rejected = await reviewCheckin(prisma, {
        chatId,
        reference: checkinReference(3001),
        reviewerId: '9001',
        decision: 'REJECTED',
        comment: null,
        now: day,
        audit: false,
    })
    expect(rejected.type).toBe('REJECTED')

    const replacement = await submit(chatId, userId, 3002, day)
    expect(replacement.type).toBe('CREATED')
    expect(await prisma.telegramCheckin.count({ where: { chatId, userId } })).toBe(2)
})

test('competing decisions produce exactly one terminal transition', async () => {
    const chatId = newChatId()
    const userId = '1004'
    const day = wibDay(new Date('2026-11-20T10:00:00Z'))
    await submit(chatId, userId, 4001, day)

    const results = await Promise.all([
        reviewCheckin(prisma, {
            chatId,
            reference: checkinReference(4001),
            reviewerId: '9001',
            decision: 'APPROVED',
            comment: null,
            now: day,
            audit: false,
        }),
        reviewCheckin(prisma, {
            chatId,
            reference: checkinReference(4001),
            reviewerId: '9002',
            decision: 'REJECTED',
            comment: null,
            now: day,
            audit: false,
        }),
    ])

    expect(results.filter(result => result.type === 'APPROVED' || result.type === 'REJECTED')).toHaveLength(1)
    expect(results.filter(result => result.type === 'NOT_WAITING')).toHaveLength(1)

    const row = await getCheckinBySource(prisma, chatId, 4001)
    expect(['APPROVED', 'REJECTED']).toContain(row!.status)
})

test('audit requires the participant oldest waiting attempt and extends the run', async () => {
    const chatId = newChatId()
    const userId = '1005'
    const day1 = wibDay(new Date('2026-11-18T10:00:00Z'))
    const day2 = addDays(day1, 1)
    const day3 = addDays(day1, 2)
    const day4 = addDays(day1, 3)

    await submit(chatId, userId, 5001, day1)
    await submit(chatId, userId, 5002, day2)
    await submit(chatId, userId, 5003, day3)

    const approvedDay1 = await reviewCheckin(prisma, {
        chatId,
        reference: checkinReference(5001),
        reviewerId: '9001',
        decision: 'APPROVED',
        comment: null,
        now: day1,
        audit: false,
    })
    expect(approvedDay1.type).toBe('APPROVED')

    const before = await getCheckinBySource(prisma, chatId, 5003)

    const blocked = await reviewCheckin(prisma, {
        chatId,
        reference: checkinReference(5003),
        reviewerId: '9001',
        decision: 'APPROVED',
        comment: null,
        now: day4,
        audit: true,
    })
    expect(blocked.type).toBe('NOT_OLDEST')
    if (blocked.type === 'NOT_OLDEST')
        expect(blocked.oldestReference).toBe(checkinReference(5002))

    const audited = await reviewCheckin(prisma, {
        chatId,
        reference: checkinReference(5002),
        reviewerId: '9001',
        decision: 'APPROVED',
        comment: 'late proof',
        now: day4,
        audit: true,
    })
    expect(audited.type).toBe('APPROVED')
    if (audited.type === 'APPROVED')
        expect(audited.streak).toBe(2)

    const after = await getCheckinBySource(prisma, chatId, 5003)
    expect(after!.createdAt.getTime()).toBe(before!.createdAt.getTime())
})

test('six prior approvals plus today gives the day-7 milestone', async () => {
    const chatId = newChatId()
    const userId = '1006'
    const today = wibDay(new Date('2026-11-20T10:00:00Z'))

    for (let offset = 6; offset >= 0; offset--) {
        const day = addDays(today, -offset)
        await submit(chatId, userId, 6000 + offset, day)
    }

    for (let offset = 6; offset >= 1; offset--) {
        const day = addDays(today, -offset)
        const result = await reviewCheckin(prisma, {
            chatId,
            reference: checkinReference(6000 + offset),
            reviewerId: '9001',
            decision: 'APPROVED',
            comment: null,
            now: day,
            audit: false,
        })
        expect(result.type).toBe('APPROVED')
    }

    const final = await reviewCheckin(prisma, {
        chatId,
        reference: checkinReference(6000),
        reviewerId: '9001',
        decision: 'APPROVED',
        comment: null,
        now: today,
        audit: false,
    })

    expect(final.type).toBe('APPROVED')
    if (final.type === 'APPROVED') {
        expect(final.streak).toBe(7)
        expect(final.milestone).toBe(7)
    }
})

test('reviewer reminder posts once for today count in the configured group only', async () => {
    const chatId = newChatId()
    const foreignChatId = newChatId()
    const emptyChatId = newChatId()
    const day = wibDay(new Date('2026-11-20T15:00:00Z'))

    const { api, messages } = makeApi()

    const empty = await runReviewerReminder(api, makeDeps(emptyChatId, day), day)
    expect(empty).toBe(0)
    expect(messages).toHaveLength(0)

    await submit(chatId, '1101', 7001, day, 'one')
    await submit(chatId, '1102', 7002, day, 'two')
    await submit(foreignChatId, '1103', 7003, day, 'foreign')

    const count = await runReviewerReminder(api, makeDeps(chatId, day), day)

    expect(count).toBe(2)
    expect(messages).toHaveLength(1)
    expect(messages[0][0]).toBe(Number(chatId))
    expect(messages[0][1]).toContain('2 check-ins are waiting for review')
})

test('loss notices are claimed once and reach only the broken streak', async () => {
    const chatId = newChatId()
    const today = wibDay(new Date('2026-11-20T10:00:00Z'))
    const twoDaysAgo = addDays(today, -2)
    const yesterday = addDays(today, -1)

    for (const [userId, sources] of [['1201', [8001]], ['1202', [8002, 8003]]] as const) {
        for (const source of sources) {
            const day = source === 8001 ? twoDaysAgo : source === 8002 ? twoDaysAgo : yesterday
            await submit(chatId, userId, source, day)
            await reviewCheckin(prisma, {
                chatId,
                reference: checkinReference(source),
                reviewerId: '9001',
                decision: 'APPROVED',
                comment: null,
                now: day,
                audit: false,
            })
        }
        await recordDmOptIn(prisma, chatId, userId, today)
    }

    const { api, messages } = makeApi()
    const deps = makeDeps(chatId, today)

    const first = await runLossNotices(api, deps, today)
    const second = await runLossNotices(api, deps, today)

    expect(first).toEqual(['1201'])
    expect(second).toEqual([])
    expect(messages).toHaveLength(1)
    expect(messages[0][0]).toBe(1201)

    const approvedDays = await getApprovedDays(prisma, chatId, '1201', yesterday)
    expect(countConsecutiveDays(approvedDays, yesterday)).toBe(0)

    const participant = await prisma.telegramParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: '1201' } },
    })
    expect(participant!.lastLossDay?.toISOString().slice(0, 10)).toBe(today.toISOString().slice(0, 10))
})

test('today queue and point lookups are scoped to the chat', async () => {
    const chatId = newChatId()
    const otherChatId = newChatId()
    const day = wibDay(new Date('2026-11-20T10:00:00Z'))

    await submit(chatId, '1301', 9001, day)
    await submit(otherChatId, '1301', 9001, day)

    expect(await countTodayWaiting(prisma, chatId, day)).toBe(1)
    expect((await getTodayWaiting(prisma, chatId, day)).map(row => row.sourceMessageId)).toEqual([9001])

    const latest = await getLatestForDay(prisma, chatId, '1301', day)
    expect(latest!.chatId).toBe(chatId)

    expect(await claimLossNotices(prisma, newChatId(), day)).toEqual([])
})
