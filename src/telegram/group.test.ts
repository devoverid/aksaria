import type { ChatMember, Message, Update } from 'grammy/types'
import { afterAll, expect, test } from 'bun:test'
import { PrismaClient } from '@generatedDB/client'
import { addDays, wibDay } from '@core/checkin/policy'
import { checkinReference } from '@core/checkin/group-ledger'
import { Bot } from 'grammy'
import { registerTelegramHandlers } from './index'

const prisma = new PrismaClient()

afterAll(async () => {
    await prisma.$disconnect()
})

let chatCounter = 0
let updateCounter = 0

const BASE_DAY = wibDay(new Date('2026-11-20T10:00:00Z'))
const BOT_USER = {
    id: 777_001,
    is_bot: true,
    first_name: 'Aksaria',
    username: 'aksaria_test_bot',
}

interface Call {
    method: string
    payload: Record<string, any>
}

interface HarnessOptions {
    memberTag?: string
    members?: Record<string, ChatMember>
}

function member(userId: number, status: ChatMember['status'] = 'member', extra: Record<string, unknown> = {}): ChatMember {
    return {
        status,
        user: { id: userId, is_bot: false, first_name: `User ${userId}` },
        ...(status === 'restricted' ? { is_member: true } : {}),
        ...extra,
    } as unknown as ChatMember
}

function newChatId(): string {
    chatCounter++
    return `-100${String(Date.now()).slice(-9)}${String(chatCounter).padStart(2, '0')}`
}

async function createHarness(options: HarnessOptions = {}) {
    const chatId = newChatId()
    const bot = new Bot('12345:test-token')
    const calls: Call[] = []
    const sentMessages: Message[] = []
    const tagUpdates: Array<{ chatId: number | string, userId: number, tag: string }> = []
    const fatal: Error[] = []
    const members = new Map<string, ChatMember>(Object.entries(options.members ?? {}))
    const blocked = new Set<number>()
    const clock = { value: BASE_DAY.getTime() + 10 * 3_600_000 }
    let messageCounter = 10_000
    let failEdit = false

    const now = () => new Date(clock.value)

    function membership(userId: number): ChatMember {
        return members.get(String(userId)) ?? member(userId)
    }

    function returnedMessage(chatIdValue: number | string, text: string | undefined, replyMarkup: unknown): Message {
        const numeric = Number(chatIdValue)
        return {
            message_id: ++messageCounter,
            date: Math.floor(clock.value / 1000),
            chat: numeric === Number(chatId)
                ? { id: numeric, type: 'supergroup', title: 'Test group' }
                : { id: numeric, type: 'private', first_name: 'Private' },
            from: BOT_USER,
            text,
            reply_markup: replyMarkup,
        } as unknown as Message
    }

    bot.api.config.use((async (_prev: unknown, method: string, payload: Record<string, any>) => {
        calls.push({ method, payload })

        switch (method) {
            case 'getMe':
                return { ok: true, result: BOT_USER }
            case 'getChatMember':
                return { ok: true, result: membership(Number(payload.user_id)) }
            case 'sendMessage': {
                if (blocked.has(Number(payload.chat_id)))
                    return { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }

                const message = returnedMessage(payload.chat_id, payload.text, payload.reply_markup)
                sentMessages.push(message)
                return { ok: true, result: message }
            }
            case 'sendPhoto':
            case 'sendDocument':
                return { ok: true, result: returnedMessage(payload.chat_id, undefined, undefined) }
            case 'editMessageText':
                if (failEdit)
                    return { ok: false, error_code: 400, description: 'Bad Request: message to edit not found' }
                return { ok: true, result: true }
            case 'setChatMemberTag': {
                const userId = Number(payload.user_id)
                tagUpdates.push({ chatId: payload.chat_id, userId, tag: payload.tag })
                members.set(String(userId), member(userId, 'member', { tag: payload.tag }))
                return { ok: true, result: true }
            }
            default:
                return { ok: true, result: true }
        }
    }) as never)

    await bot.init()

    const deps = {
        prisma,
        chatId,
        botId: BOT_USER.id,
        botUsername: BOT_USER.username!,
        memberTag: options.memberTag ?? 'Grinder',
        now,
    }

    registerTelegramHandlers(bot, deps, err => fatal.push(err))
    bot.catch((err) => {
        throw err.error
    })

    function groupChat() {
        return { id: Number(chatId), type: 'supergroup', title: 'Test group' }
    }

    async function sendGroup(
        content: { text?: string, caption?: string },
        fromId: number,
        extra: Record<string, unknown> = {},
    ): Promise<Message> {
        const text = content.text ?? content.caption
        const commandLength = text?.startsWith('/') ? text.split(/\s/)[0].length : 0
        const entity = commandLength
            ? [{ type: 'bot_command', offset: 0, length: commandLength }]
            : []

        const message = {
            message_id: ++messageCounter,
            date: Math.floor(clock.value / 1000),
            chat: groupChat(),
            from: { id: fromId, is_bot: false, first_name: `User ${fromId}` },
            ...(content.text ? { text: content.text, entities: entity } : {}),
            ...(content.caption ? { caption: content.caption, caption_entities: entity } : {}),
            ...extra,
        } as unknown as Message

        await bot.handleUpdate({ update_id: ++updateCounter, message } as Update)
        return message
    }

    async function sendOtherGroup(text: string, fromId: number): Promise<void> {
        const message = {
            message_id: ++messageCounter,
            date: Math.floor(clock.value / 1000),
            chat: { id: Number(chatId) + 1, type: 'supergroup', title: 'Other group' },
            from: { id: fromId, is_bot: false, first_name: `User ${fromId}` },
            text,
            entities: [{ type: 'bot_command', offset: 0, length: text.split(/\s/)[0].length }],
        } as unknown as Message

        await bot.handleUpdate({ update_id: ++updateCounter, message } as Update)
    }

    async function sendPrivate(text: string, fromId: number): Promise<void> {
        const message = {
            message_id: ++messageCounter,
            date: Math.floor(clock.value / 1000),
            chat: { id: fromId, type: 'private', first_name: `User ${fromId}` },
            from: { id: fromId, is_bot: false, first_name: `User ${fromId}` },
            text,
            entities: [{ type: 'bot_command', offset: 0, length: text.split(/\s/)[0].length }],
        } as unknown as Message

        await bot.handleUpdate({ update_id: ++updateCounter, message } as Update)
    }

    async function replay(message: Message): Promise<void> {
        await bot.handleUpdate({ update_id: ++updateCounter, message } as Update)
    }

    async function click(userId: number, data: string, message: Message): Promise<void> {
        await bot.handleUpdate({
            update_id: ++updateCounter,
            callback_query: {
                id: `callback-${updateCounter}`,
                from: { id: userId, is_bot: false, first_name: `User ${userId}` },
                chat_instance: 'test-instance',
                data,
                message,
            },
        } as Update)
    }

    function methodCalls(method: string): Call[] {
        return calls.filter(call => call.method === method)
    }

    function groupSends(): Call[] {
        return methodCalls('sendMessage').filter(call => Number(call.payload.chat_id) === Number(chatId))
    }

    return {
        bot,
        prisma,
        chatId,
        calls,
        sentMessages,
        tagUpdates,
        fatal,
        members,
        blocked,
        setNow: (date: Date) => { clock.value = date.getTime() },
        sendGroup,
        sendOtherGroup,
        sendPrivate,
        replay,
        click,
        methodCalls,
        groupSends,
        setFailEdit: (value: boolean) => { failEdit = value },
    }
}

function photo(fileId: string) {
    return [
        { file_id: `${fileId}-small`, file_unique_id: 'small', width: 100, height: 100 },
        { file_id: fileId, file_unique_id: 'large', width: 800, height: 800 },
    ]
}

test('ping responds only in the allowlisted group and only when addressed to this bot', async () => {
    const harness = await createHarness()

    await harness.sendGroup({ text: '/ping@aksaria_test_bot' }, 2001)
    expect(harness.groupSends().at(-1)?.payload.text).toBe('Pong!')

    await harness.sendGroup({ text: '/checkin_status' }, 2001)
    expect(harness.groupSends().at(-1)?.payload.text).toContain('https://t.me/aksaria_test_bot')
    expect(harness.groupSends().at(-1)?.payload.text).not.toContain('Streak')

    await harness.sendGroup({ text: '/checkin_details TG-1' }, 2001)
    expect(harness.groupSends().at(-1)?.payload.text).toContain('https://t.me/aksaria_test_bot')
    expect(harness.groupSends().at(-1)?.payload.text).not.toContain('Check-in: TG-')

    const before = harness.calls.length
    await harness.sendOtherGroup('/ping@aksaria_test_bot', 2001)
    await harness.sendGroup({ text: '/checkin@OtherBot' }, 2001)
    await harness.sendGroup({ text: 'ordinary text' }, 2001)
    await harness.sendGroup({ text: '/ping' }, 2001, {
        sender_chat: { id: -100777, type: 'channel', title: 'Anonymous' },
    })

    expect(harness.calls.length).toBe(before)
})

test('submission stores proof metadata, welcomes the first check-in, not the second', async () => {
    const harness = await createHarness()
    const userId = 2101

    const firstMessage = await harness.sendGroup({ caption: '/checkin Finished exercise' }, userId, { photo: photo('photo-big') })

    const first = await harness.prisma.telegramCheckin.findMany({ where: { chatId: harness.chatId, userId: String(userId) } })
    expect(first).toHaveLength(1)
    expect(first[0].status).toBe('WAITING')
    expect(first[0].proofKind).toBe('PHOTO')
    expect(first[0].proofFileId).toBe('photo-big')
    expect(harness.groupSends()[0].payload.text).toContain('Welcome!')
    expect(harness.groupSends()[0].payload.text).toContain('WAITING')
    expect(harness.groupSends()[0].payload.reply_markup.inline_keyboard).toHaveLength(1)

    const sendsAfterFirst = harness.groupSends().length
    await harness.replay(firstMessage)
    expect(harness.groupSends().length).toBe(sendsAfterFirst)

    await harness.sendGroup({ caption: '/checkin Duplicate source' }, userId, { photo: photo('photo-duplicate') })
    expect(harness.groupSends().at(-1)?.payload.text).toContain(checkinReference(firstMessage.message_id))
    expect(harness.groupSends().at(-1)?.payload.text).toContain('already have a check-in for today')
    expect(harness.groupSends().at(-1)?.payload.reply_markup).toBeUndefined()

    harness.setNow(addDays(BASE_DAY, 1))
    const secondMessage = await harness.sendGroup({ caption: '/checkin Day two' }, userId, { photo: photo('photo-second') })

    const rows = await harness.prisma.telegramCheckin.findMany({
        where: { chatId: harness.chatId, userId: String(userId) },
        orderBy: { sourceMessageId: 'asc' },
    })
    expect(rows).toHaveLength(2)
    expect(harness.groupSends().at(-1)?.payload.text).not.toContain('Welcome!')

    await harness.prisma.telegramCheckin.update({
        where: { chatId_sourceMessageId: { chatId: harness.chatId, sourceMessageId: secondMessage.message_id } },
        data: { receiptMessageId: null },
    })
    await harness.replay(secondMessage)
    expect(harness.groupSends().at(-1)?.payload.text).not.toContain('Welcome!')
    expect(harness.groupSends().at(-1)?.payload.text).toContain('WAITING')

    await harness.sendGroup({ text: '/checkin Read the docs' }, 2102, {
        reply_to_message: {
            message_id: 7,
            date: Math.floor(BASE_DAY.getTime() / 1000),
            from: { id: 2102, is_bot: false, first_name: 'User 2102' },
            document: { file_id: 'document-42', file_unique_id: 'doc' },
        },
    })

    const document = await harness.prisma.telegramCheckin.findFirst({
        where: { chatId: harness.chatId, userId: '2102' },
    })
    expect(document!.proofKind).toBe('DOCUMENT')
    expect(document!.proofFileId).toBe('document-42')
})

test('any member can review another member, never their own check-in', async () => {
    const harness = await createHarness({
        members: {
            '2201': member(2201, 'member'),
            '2204': member(2204, 'member'),
        },
    })

    await harness.sendGroup({ caption: '/checkin Review me' }, 2201, { photo: photo('photo-review') })
    const stored = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2201' } })
    const receipt = harness.sentMessages.find(message => message.text?.includes('WAITING'))!

    await harness.click(2201, `ci:a:${checkinReference(stored!.sourceMessageId)}`, receipt)
    expect(harness.methodCalls('answerCallbackQuery').at(-1)?.payload.text).toBe('You cannot review your own check-in.')

    let row = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2201' } })
    expect(row!.status).toBe('WAITING')

    await harness.click(2204, `ci:a:${checkinReference(stored!.sourceMessageId)}`, receipt)
    row = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2201' } })
    expect(row!.status).toBe('APPROVED')
    expect(harness.methodCalls('editMessageText').at(-1)?.payload.text).toContain('APPROVED')

    const edits = harness.methodCalls('editMessageText').length
    await harness.click(2204, `ci:a:${checkinReference(stored!.sourceMessageId)}`, receipt)
    expect(harness.methodCalls('editMessageText').length).toBe(edits)

    await harness.sendGroup({ caption: '/checkin Second' }, 2203, { photo: photo('photo-second') })
    const second = await harness.prisma.telegramCheckin.findFirst({
        where: { chatId: harness.chatId, userId: '2203', status: 'WAITING' },
    })
    const foreignReceipt = { ...receipt, from: { id: 2204, is_bot: false, first_name: 'Human' } }
    await harness.click(2204, `ci:a:${checkinReference(second!.sourceMessageId)}`, foreignReceipt as Message)
    const stillWaiting = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, sourceMessageId: second!.sourceMessageId } })
    expect(stillWaiting!.status).toBe('WAITING')
})

test('private review is peer-only and keeps comments out of the group', async () => {
    const harness = await createHarness()

    await harness.sendGroup({ caption: '/checkin Needs review' }, 2302, { photo: photo('photo-private') })
    const stored = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2302' } })
    const reference = checkinReference(stored!.sourceMessageId)

    await harness.sendPrivate(`/checkin_review ${reference} approve self`, 2302)
    expect(harness.methodCalls('sendMessage').at(-1)?.payload.text).toBe('You cannot review your own check-in.')

    let row = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2302' } })
    expect(row!.status).toBe('WAITING')
    expect(row!.comment).toBeNull()

    await harness.sendPrivate(`/checkin_review ${reference} reject needs context`, 2303)

    row = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2302' } })
    expect(row!.status).toBe('REJECTED')
    expect(row!.comment).toBe('needs context')

    expect(harness.groupSends().some(call => String(call.payload.text).includes('needs context'))).toBe(false)

    const own = await harness.sendGroup({ caption: '/checkin Own waiting' }, 2303, { photo: photo('photo-own') })
    const other = await harness.sendGroup({ caption: '/checkin Other waiting' }, 2304, { photo: photo('photo-other') })

    await harness.sendPrivate('/checkin_review', 2303)
    const queue = harness.methodCalls('sendMessage').at(-1)?.payload.text as string
    expect(queue).toContain('Waiting check-ins from other members: 1')
    expect(queue).toContain(checkinReference(other.message_id))
    expect(queue).not.toContain(checkinReference(own.message_id))
})

test('details are author-or-moderator only and prove privately', async () => {
    const harness = await createHarness({
        members: { '2401': member(2401, 'member') },
    })

    await harness.sendGroup({ caption: '/checkin Details proof' }, 2401, { photo: photo('photo-details') })
    const stored = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2401' } })

    await harness.sendPrivate(`/checkin_details ${checkinReference(stored!.sourceMessageId)}`, 2402)
    expect(harness.methodCalls('sendMessage').at(-1)?.payload.text).toBe('Check-in not found.')

    await harness.sendPrivate('/start', 2401)
    await harness.sendPrivate(`/checkin_details ${checkinReference(stored!.sourceMessageId)}`, 2401)

    const detail = harness.methodCalls('sendMessage').at(-1)?.payload.text as string
    expect(detail).toContain('Details proof')
    expect(harness.methodCalls('sendPhoto').at(-1)?.payload.photo).toBe('photo-details')
    expect(harness.methodCalls('sendPhoto').at(-1)?.payload.chat_id).toBe(2401)

    await harness.sendPrivate('/checkin_status', 2401)
    expect(harness.methodCalls('sendMessage').at(-1)?.payload.text).toContain('Check-in: WAITING')
})

test('member tag is posted by moderators and claimed only by eligible members', async () => {
    const harness = await createHarness({
        members: {
            '2501': member(2501, 'administrator', { can_manage_tags: true }),
            '2502': member(2502, 'member'),
            '2503': member(2503, 'member', { tag: 'Other' }),
        },
    })

    await harness.sendGroup({ text: '/post_grinder_tag' }, 2502)
    expect(harness.groupSends().at(-1)?.payload.text).toContain('not allowed')

    await harness.sendGroup({ text: '/post_grinder_tag' }, 2501)
    const post = harness.groupSends().at(-1)!
    expect(post.payload.text).toBe('Claim member tag: Grinder')

    const posted = harness.sentMessages.at(-1)!
    await harness.click(2502, 'tag:claim', posted)
    expect(harness.tagUpdates).toEqual([{ chatId: harness.chatId, userId: 2502, tag: 'Grinder' }])
    expect(harness.methodCalls('answerCallbackQuery').at(-1)?.payload.text).toBe('Member tag updated.')

    await harness.click(2502, 'tag:claim', posted)
    expect(harness.tagUpdates).toHaveLength(1)
    expect(harness.methodCalls('answerCallbackQuery').at(-1)?.payload.text).toBe('You already have this tag.')

    await harness.click(2503, 'tag:claim', posted)
    expect(harness.tagUpdates).toHaveLength(1)
    expect(harness.methodCalls('answerCallbackQuery').at(-1)?.payload.text).toBe('You already have another tag.')

    await harness.click(2501, 'tag:claim', posted)
    expect(harness.tagUpdates).toHaveLength(1)
    expect(harness.methodCalls('answerCallbackQuery').at(-1)?.payload.text).toBe('Only regular members can claim this tag.')
})

test('a deleted receipt and a blocked DM do not undo a decision', async () => {
    const harness = await createHarness({
        members: { '2601': member(2601, 'administrator', { can_manage_tags: true }) },
    })

    await harness.sendGroup({ caption: '/checkin Durable state' }, 2602, { photo: photo('photo-durable') })
    const stored = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2602' } })

    await harness.sendPrivate('/start', 2602)
    harness.setFailEdit(true)
    harness.blocked.add(2602)

    await harness.sendPrivate(`/checkin_review ${checkinReference(stored!.sourceMessageId)} approve persisted`, 2601)

    const row = await harness.prisma.telegramCheckin.findFirst({ where: { chatId: harness.chatId, userId: '2602' } })
    expect(row!.status).toBe('APPROVED')

    harness.blocked.delete(2602)
    await harness.sendPrivate('/checkin_status', 2602)
    expect(harness.methodCalls('sendMessage').at(-1)?.payload.text).toContain('Check-in: APPROVED')
})

test('a stale membership update does not fail while current rights are intact', async () => {
    const harness = await createHarness({
        members: {
            '2751': member(2751, 'administrator', { can_manage_tags: true }),
            [String(BOT_USER.id)]: member(BOT_USER.id, 'administrator', { can_manage_tags: true }),
        },
    })

    await harness.bot.handleUpdate({
        update_id: ++updateCounter,
        my_chat_member: {
            chat: { id: Number(harness.chatId), type: 'supergroup', title: 'Test group' },
            from: { id: 2751, is_bot: false, first_name: 'Admin' },
            date: Math.floor(BASE_DAY.getTime() / 1000),
            old_chat_member: member(BOT_USER.id, 'administrator', { can_manage_tags: true }),
            new_chat_member: member(BOT_USER.id, 'member'),
        },
    } as Update)

    expect(harness.fatal).toHaveLength(0)
})

test('losing administrator or Manage Tags is a fatal configuration change', async () => {
    const harness = await createHarness({
        members: { '2701': member(2701, 'administrator', { can_manage_tags: true }) },
    })

    await harness.bot.handleUpdate({
        update_id: ++updateCounter,
        my_chat_member: {
            chat: { id: Number(harness.chatId), type: 'supergroup', title: 'Test group' },
            from: { id: 2701, is_bot: false, first_name: 'Admin' },
            date: Math.floor(BASE_DAY.getTime() / 1000),
            old_chat_member: member(BOT_USER.id, 'administrator', { can_manage_tags: true }),
            new_chat_member: member(BOT_USER.id, 'member'),
        },
    } as Update)

    expect(harness.fatal).toHaveLength(1)
    expect(harness.fatal[0].message).toContain('lost administrator or Manage Tags')
})

test('a group migration is fatal and reports the replacement chat id', async () => {
    const harness = await createHarness()

    await harness.sendGroup({ text: '/ping@aksaria_test_bot' }, 2801, { migrate_to_chat_id: -100999 })

    expect(harness.fatal).toHaveLength(1)
    expect(harness.fatal[0].message).toContain('-100999')
})
