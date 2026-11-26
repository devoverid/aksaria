import type { TelegramDeps } from './deps'
import type { Api, Context } from 'grammy'
import type { ChatMember, Message } from 'grammy/types'
import type { TelegramCheckin } from '@generatedDB/client'
import { log } from '@core/logger'
import {
    addDays,
    countConsecutiveDays,
    dayKey,
    STREAK_MILESTONES,
    wibDay,
} from '@core/checkin/policy'
import {
    checkinReference,
    countTodayWaiting,
    findCheckinByReference,
    getApprovedDays,
    getCheckinBySource,
    getLatestForDay,
    getParticipant,
    getPriorAttempt,
    getTodayWaiting,
    recordReceipt,
    reviewCheckin,
    submitCheckin,
    type ReviewCheckinResult,
    type SubmitCheckinResult,
    type TelegramProofKind,
} from '@core/checkin/group-ledger'
import { fetchChatMember, isGroupMember, isModerator } from './auth'
import { InlineKeyboard } from 'grammy'

const MAX_DESCRIPTION_LENGTH = 2_000
const MAX_COMMENT_LENGTH = 500
const GROUP_PRIVATE_LINK_TEXT = (username: string) =>
    `🔒 Status & details are DM-only → https://t.me/${username}\nTap /start and see your spark! ⚡`

class ProofError extends Error {}

interface Proof {
    kind: TelegramProofKind
    fileId: string
}

function proofFromMessage(message: Message): Proof | 'unsupported' | null {
    if (message.photo?.length) {
        return {
            kind: 'PHOTO',
            fileId: message.photo[message.photo.length - 1].file_id,
        }
    }
    if (message.document)
        return { kind: 'DOCUMENT', fileId: message.document.file_id }
    if (message.video || message.audio || message.voice || message.video_note || message.animation || message.sticker
        || message.poll || message.location || message.venue || message.contact || message.dice || message.game) {
        return 'unsupported'
    }

    return null
}

function extractProof(message: Message): Proof | null {
    if (message.media_group_id)
        throw new ProofError('📸 One at a time! Send a single photo or document.')

    const commandProof = proofFromMessage(message)
    if (commandProof === 'unsupported')
        throw new ProofError('📎 Proof is one photo or document. Pick your best!')

    const reply = message.reply_to_message
    if (!reply) {
        if (message.has_protected_content && commandProof)
            throw new ProofError('🔒 Protected media can’t be proof. Choose something shareable.')

        return commandProof
    }

    const replyProof = proofFromMessage(reply)
    if (replyProof === 'unsupported')
        throw new ProofError('📎 Proof is one photo or document. Pick your best!')

    if (!replyProof)
        return commandProof

    if (reply.from?.id !== message.from?.id)
        throw new ProofError('🫵 Your proof, your glory — use your own media.')

    if (reply.media_group_id)
        throw new ProofError('📸 One at a time! Send a single photo or document.')

    if (message.message_thread_id !== undefined && reply.message_thread_id !== undefined
        && message.message_thread_id !== reply.message_thread_id) {
        throw new ProofError('🧵 Keep the proof in the same topic as the command.')
    }

    if (message.has_protected_content || reply.has_protected_content)
        throw new ProofError('🔒 Protected media can’t be proof. Choose something shareable.')

    if (commandProof)
        throw new ProofError('☝️ One proof only: attach it to the command or reply to it, not both.')

    return replyProof
}

function receiptText(checkin: TelegramCheckin, isFirst: boolean, botUsername: string): string {
    let text = `⚡ Check-in ${checkinReference(checkin.sourceMessageId)}: ${checkin.status}`

    if (isFirst) {
        text += `\n\n🎉 Welcome! First check-in locked in. A teammate will review it; approved days build your streak. DM https://t.me/${botUsername} → /start for your private dashboard.`
    }

    return text
}

function reviewKeyboard(reference: string): InlineKeyboard {
    return new InlineKeyboard()
        .text('✅ Approve', `ci:a:${reference}`)
        .text('❌ Reject', `ci:r:${reference}`)
}

async function sendWaitingReceipt(ctx: Context, deps: TelegramDeps, checkin: TelegramCheckin, isFirst: boolean): Promise<void> {
    const message = ctx.message!
    const keyboard = checkin.status === 'WAITING' ? reviewKeyboard(checkinReference(checkin.sourceMessageId)) : undefined

    const sent = await ctx.api.sendMessage(deps.chatId, receiptText(checkin, isFirst, deps.botUsername), {
        message_thread_id: message.message_thread_id,
        reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
        reply_markup: keyboard,
    })

    await recordReceipt(deps.prisma, deps.chatId, checkin.sourceMessageId, sent.message_id)
}

async function deliverExistingReceipt(ctx: Context, deps: TelegramDeps, checkin: TelegramCheckin): Promise<void> {
    if (checkin.receiptMessageId !== null)
        return

    const first = (await deps.prisma.telegramCheckin.count({
        where: { chatId: deps.chatId, userId: checkin.userId },
    })) === 1

    await sendWaitingReceipt(ctx, deps, checkin, first)
}

export async function handleCheckin(ctx: Context, deps: TelegramDeps, args: string): Promise<void> {
    const message = ctx.message!
    const from = ctx.from!

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member))
        return

    const existing = await getCheckinBySource(deps.prisma, deps.chatId, message.message_id)
    if (existing) {
        await deliverExistingReceipt(ctx, deps, existing)
        return
    }

    const description = args.trim()
    if (!description) {
        await ctx.reply('⚡ /checkin <your win today> + one photo/document (or reply to your own).')
        return
    }
    if ([...description].length > MAX_DESCRIPTION_LENGTH) {
        await ctx.reply(`✍️ Easy there, novelist! Keep it to 1–${MAX_DESCRIPTION_LENGTH} characters.`)
        return
    }

    let proof: Proof | null
    try {
        proof = extractProof(message)
    }
    catch (err) {
        if (err instanceof ProofError) {
            await ctx.reply(err.message)
            return
        }
        throw err
    }

    const now = deps.now()
    const createdAt = new Date(message.date * 1000)
    const submitDay = wibDay(createdAt)

    if (dayKey(submitDay) !== dayKey(wibDay(now))) {
        await ctx.reply('🌙 Midnight got it! That one’s too old — fire off today’s check-in instead.')
        return
    }

    let result: SubmitCheckinResult
    try {
        result = await submitCheckin(deps.prisma, {
            chatId: deps.chatId,
            userId: String(from.id),
            sourceMessageId: message.message_id,
            day: submitDay,
            description,
            createdAt,
            proofKind: proof?.kind ?? null,
            proofFileId: proof?.fileId ?? null,
        })
    }
    catch (err) {
        log.error(`Telegram check-in submission failed: ${err instanceof Error ? err.message : 'unknown error'}`)
        await ctx.reply('💥 Oops, the check-in didn’t stick. Give it another shot!')
        return
    }

    if (result.type === 'ALREADY_SUBMITTED') {
        await ctx.reply(`✅ ${checkinReference(result.checkin.sourceMessageId)}: ${result.checkin.status}. You already checked in today — one spark per day!`)
        return
    }

    if (result.type === 'DUPLICATE') {
        await deliverExistingReceipt(ctx, deps, result.checkin)
        return
    }

    try {
        await sendWaitingReceipt(ctx, deps, result.checkin, result.isFirst)
    }
    catch (err) {
        log.error(`Telegram check-in receipt failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
}

export async function handleGroupPrivateLink(ctx: Context, deps: TelegramDeps): Promise<void> {
    const from = ctx.from
    if (!from)
        return

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member))
        return

    await ctx.reply(GROUP_PRIVATE_LINK_TEXT(deps.botUsername))
}

export async function handlePrivateStatus(ctx: Context, deps: TelegramDeps): Promise<void> {
    const from = ctx.from
    if (!from)
        return

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member))
        return

    const today = wibDay(deps.now())
    const yesterday = addDays(today, -1)
    const latest = await getLatestForDay(deps.prisma, deps.chatId, String(from.id), today)
    const endDay = latest?.status === 'APPROVED' ? today : yesterday
    const approvedDays = await getApprovedDays(deps.prisma, deps.chatId, String(from.id), endDay)
    const streak = countConsecutiveDays(approvedDays, endDay)
    const milestone = [...STREAK_MILESTONES].filter(value => value <= streak).pop()

    const lines = [
        `⚡ Check-in: ${latest?.status ?? 'NO_CHECKIN'}`,
        latest ? `🆔 ${checkinReference(latest.sourceMessageId)}` : null,
        latest ? `📅 ${latest.day.toISOString().slice(0, 10)}` : null,
        `🔥 Streak: ${streak} day${streak === 1 ? '' : 's'}`,
        milestone ? `🏆 Best milestone: ${milestone} day${milestone === 1 ? '' : 's'}` : null,
    ].filter((line): line is string => line !== null)

    await ctx.reply(lines.join('\n'))
}

export async function handlePrivateDetails(ctx: Context, deps: TelegramDeps, args: string): Promise<void> {
    const from = ctx.from
    if (!from)
        return

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member))
        return

    const reference = args.trim().split(/\s+/)[0]
    if (!reference) {
        await ctx.reply('⚡ Usage: /checkin_details <ID>')
        return
    }

    const checkin = await findCheckinByReference(deps.prisma, deps.chatId, reference)
    const isAuthor = checkin?.userId === String(from.id)
    if (!checkin || (!isAuthor && !isModerator(member))) {
        await ctx.reply('🔍 Check-in not found.')
        return
    }

    const prior = await getPriorAttempt(deps.prisma, checkin)
    const lines = [
        `🆔 Check-in: ${checkinReference(checkin.sourceMessageId)}`,
        `📅 Date: ${checkin.day.toISOString().slice(0, 10)}`,
        `🔎 State: ${checkin.status}`,
        `📝 Description: ${checkin.description}`,
        `💬 Comment: ${checkin.comment ?? 'None'}`,
        `⏮️ Previous: ${prior ? `${checkinReference(prior.sourceMessageId)} (${prior.day.toISOString().slice(0, 10)}, ${prior.status})` : 'None'}`,
    ]

    await ctx.reply(lines.join('\n'))

    if (!checkin.proofKind || !checkin.proofFileId)
        return

    try {
        if (checkin.proofKind === 'PHOTO')
            await ctx.api.sendPhoto(Number(from.id), checkin.proofFileId)
        else
            await ctx.api.sendDocument(Number(from.id), checkin.proofFileId)
    }
    catch {
        await ctx.reply('🖼️ Proof didn’t make it through — the details still count!')
    }
}

function parseReviewArguments(args: string): { reference: string; decision: 'APPROVED' | 'REJECTED'; comment: string | null } | null {
    const match = /^(\S+)\s+(approve|reject)(?:\s+([\s\S]*))?$/i.exec(args.trim())
    if (!match)
        return null

    const comment = match[3]?.trim() || null
    if (comment && [...comment].length > MAX_COMMENT_LENGTH)
        return null

    return {
        reference: match[1],
        decision: match[2].toLowerCase() === 'approve' ? 'APPROVED' : 'REJECTED',
        comment,
    }
}

async function notifyAuthor(api: Api, deps: TelegramDeps, checkin: TelegramCheckin, milestone: number | null): Promise<void> {
    const participant = await getParticipant(deps.prisma, deps.chatId, checkin.userId)
    if (!participant?.dmStartedAt)
        return

    const member = await fetchChatMember(api, deps.chatId, checkin.userId)
    if (!isGroupMember(member))
        return

    const lines = [
        `⚡ Your check-in ${checkinReference(checkin.sourceMessageId)}: ${checkin.status}`,
        checkin.comment ? `💬 ${checkin.comment}` : null,
        milestone ? `🏆 Streak milestone: ${milestone} day${milestone === 1 ? '' : 's'}!` : null,
    ].filter((line): line is string => line !== null)

    try {
        await api.sendMessage(Number(checkin.userId), lines.join('\n'))
    }
    catch {
        // Delivery is best-effort; private commands remain the result path.
    }
}

async function editReceipt(api: Api, deps: TelegramDeps, checkin: TelegramCheckin, milestone: number | null): Promise<void> {
    if (checkin.receiptMessageId === null)
        return

    let text = `⚡ Check-in ${checkinReference(checkin.sourceMessageId)}: ${checkin.status}`
    if (milestone)
        text += `\n🏆 Streak milestone: ${milestone} day${milestone === 1 ? '' : 's'}!`

    try {
        await api.editMessageText(deps.chatId, checkin.receiptMessageId, text)
    }
    catch {
        // The public receipt may have been deleted; durable state stays private.
    }
}

async function finalizeDecision(api: Api, deps: TelegramDeps, checkin: TelegramCheckin, milestone: number | null): Promise<void> {
    await editReceipt(api, deps, checkin, milestone)
    await notifyAuthor(api, deps, checkin, milestone)
}

function reviewFailureMessage(result: ReviewCheckinResult, audit: boolean): string {
    switch (result.type) {
        case 'NOT_FOUND':
            return '🔍 Check-in not found.'
        case 'NOT_WAITING':
            return '⏳ Too late — that one’s already decided!'
        case 'NOT_TODAY':
            return audit ? '🕰️ Audits only cover check-ins before today.' : '📅 Today-only review — pick a fresh one!'
        case 'NOT_OLDEST':
            return `⏳ Oldest first: ${result.oldestReference} needs a verdict.`
        default:
            return '🔍 Check-in not found.'
    }
}

async function handleReviewCommand(ctx: Context, deps: TelegramDeps, args: string, audit: boolean): Promise<void> {
    const from = ctx.from!
    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member)) {
        await ctx.reply('🙅 Only group members can review check-ins.')
        return
    }

    const command = audit ? '/checkin_audit' : '/checkin_review'
    if (!args.trim() && !audit) {
        const today = wibDay(deps.now())
        const waiting = await getTodayWaiting(deps.prisma, deps.chatId, today, 10, String(from.id))
        const total = await countTodayWaiting(deps.prisma, deps.chatId, today, String(from.id))

        if (!total) {
            await ctx.reply('🎉 All clear! No check-ins from others are waiting.')
            return
        }

        const noun = total === 1 ? 'check-in' : 'check-ins'
        const verb = total === 1 ? 'needs' : 'need'
        await ctx.reply([
            `👀 ${total} ${noun} from others ${verb} a verdict:`,
            ...waiting.map(checkin => checkinReference(checkin.sourceMessageId)),
        ].join('\n'))
        return
    }

    const parsed = parseReviewArguments(args)
    if (!parsed || (audit && parsed.decision !== 'APPROVED')) {
        await ctx.reply(audit ? `⚡ Usage: ${command} <ID> approve [comment]` : `⚡ Usage: ${command} <ID> <approve|reject> [comment]`)
        return
    }

    const target = await findCheckinByReference(deps.prisma, deps.chatId, parsed.reference)
    if (target?.userId === String(from.id)) {
        await ctx.reply('😅 That’s your own check-in — let someone else judge it!')
        return
    }

    const result = await reviewCheckin(deps.prisma, {
        chatId: deps.chatId,
        reference: parsed.reference,
        reviewerId: String(from.id),
        decision: parsed.decision,
        comment: parsed.comment,
        now: deps.now(),
        audit,
    })

    if (result.type !== 'APPROVED' && result.type !== 'REJECTED') {
        await ctx.reply(reviewFailureMessage(result, audit))
        return
    }

    await finalizeDecision(ctx.api, deps, result.checkin, result.milestone)

    const lines = [`⚡ ${checkinReference(result.checkin.sourceMessageId)}: ${result.checkin.status}`]
    if (result.milestone)
        lines.push(`🏆 Streak milestone: ${result.milestone} day${result.milestone === 1 ? '' : 's'}!`)
    await ctx.reply(lines.join('\n'))
}

export function handlePrivateReview(ctx: Context, deps: TelegramDeps, args: string): Promise<void> {
    return handleReviewCommand(ctx, deps, args, false)
}

export function handlePrivateAudit(ctx: Context, deps: TelegramDeps, args: string): Promise<void> {
    return handleReviewCommand(ctx, deps, args, true)
}

async function alert(ctx: Context, text: string): Promise<void> {
    try {
        await ctx.answerCallbackQuery({ text, show_alert: true })
    }
    catch {
        // The callback may already be too old to answer.
    }
}

export async function handleReviewCallback(ctx: Context, deps: TelegramDeps, decision: 'APPROVED' | 'REJECTED', reference: string): Promise<void> {
    const query = ctx.callbackQuery
    const message = query?.message
    const from = ctx.from

    if (!query || !message || !from || from.is_bot) {
        await alert(ctx, '⌛ This check-in is no longer available.')
        return
    }

    if (message.chat.id !== Number(deps.chatId) || message.from?.id !== deps.botId) {
        await alert(ctx, '⌛ This check-in is no longer available.')
        return
    }

    const checkin = await findCheckinByReference(deps.prisma, deps.chatId, reference)
    if (!checkin || checkin.receiptMessageId !== message.message_id) {
        await alert(ctx, '⌛ This check-in is no longer available.')
        return
    }

    const member: ChatMember | null = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isGroupMember(member)) {
        await alert(ctx, '🙅 Only group members can review check-ins.')
        return
    }

    if (checkin.userId === String(from.id)) {
        await alert(ctx, '😅 That’s your own check-in — let someone else judge it!')
        return
    }

    if (checkin.status !== 'WAITING' || dayKey(checkin.day) !== dayKey(wibDay(deps.now()))) {
        await alert(ctx, '⏳ Too late — that one’s already decided!')
        return
    }

    await ctx.answerCallbackQuery()

    try {
        const result = await reviewCheckin(deps.prisma, {
            chatId: deps.chatId,
            reference,
            reviewerId: String(from.id),
            decision,
            comment: null,
            now: deps.now(),
            audit: false,
        })

        if (result.type === 'APPROVED' || result.type === 'REJECTED')
            await finalizeDecision(ctx.api, deps, result.checkin, result.milestone)
        else
            log.warn('Telegram review callback lost a race with another decision.')
    }
    catch (err) {
        log.error(`Telegram review callback failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
}
