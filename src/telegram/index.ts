import type { BotRuntime } from '@core/runtime'
import type { PrismaClient } from '@generatedDB/client'
import type { TelegramDeps } from './deps'
import type { Message } from 'grammy/types'
import { log } from '@core/logger'
import { recordDmOptIn } from '@core/checkin/group-ledger'
import {
    handleCheckin,
    handleGroupPrivateLink,
    handlePrivateAudit,
    handlePrivateDetails,
    handlePrivateReview,
    handlePrivateStatus,
    handleReviewCallback,
} from './checkin'
import { fetchChatMember, hasRequiredAdminRights, isGroupMember, isModerator } from './auth'
import { panel } from './format'
import { runLossNotices, startTelegramJobs, stopTelegramJobs } from './jobs'
import { handlePostTag, handleTagClaim } from './member-tag'
import { Bot, GrammyError } from 'grammy'

interface TelegramConfig {
    token: string
    chatId: string
    memberTag: string
}

const GROUP_COMMANDS = [
    { command: 'start', description: 'Show how check-ins work' },
    { command: 'help', description: 'Show available commands' },
    { command: 'ping', description: 'Check that the bot is alive' },
    { command: 'checkin', description: 'Submit today\'s check-in' },
    { command: 'checkin_status', description: 'Get the private status link' },
    { command: 'checkin_details', description: 'Get the private details link' },
]

const ADMIN_GROUP_COMMANDS = [
    ...GROUP_COMMANDS,
    { command: 'post_grinder_tag', description: 'Post the member tag claim button' },
]

const PRIVATE_COMMANDS = [
    { command: 'start', description: 'Start private check-in access' },
    { command: 'help', description: 'Show available commands' },
    { command: 'checkin_status', description: 'Show your current check-in and streak' },
    { command: 'checkin_details', description: 'Show one of your check-ins' },
    { command: 'checkin_review', description: 'Review today\'s waiting check-ins' },
    { command: 'checkin_audit', description: 'Approve an older waiting check-in' },
]

function parseTelegramConfig(env: NodeJS.ProcessEnv): TelegramConfig {
    const token = env.TELEGRAM_BOT_TOKEN?.trim()
    if (!token)
        throw new Error('TELEGRAM_BOT_TOKEN is required when BOT_PLATFORMS enables Telegram')

    const rawChatId = env.TELEGRAM_GROUP_ID?.trim()
    if (!rawChatId || !/^-[1-9]\d*$/.test(rawChatId))
        throw new Error('TELEGRAM_GROUP_ID must be a negative canonical decimal chat id')
    if (!Number.isSafeInteger(Number(rawChatId)))
        throw new Error('TELEGRAM_GROUP_ID must be a safe integer')
    if (String(Number(rawChatId)) !== rawChatId)
        throw new Error('TELEGRAM_GROUP_ID must be a negative canonical decimal chat id')

    const memberTag = env.TELEGRAM_MEMBER_TAG?.trim() || 'Grinder'
    if (!/^[A-Za-z0-9 -]{1,16}$/.test(memberTag))
        throw new Error('TELEGRAM_MEMBER_TAG must be 1-16 ASCII letters, digits, spaces or hyphens')

    return { token, chatId: String(Number(rawChatId)), memberTag }
}

interface ParsedCommand {
    name: string
    args: string
}

function parseCommand(message: Message, botUsername: string): ParsedCommand | null {
    const text = message.text ?? message.caption
    if (!text)
        return null

    const entities = message.text ? message.entities ?? [] : message.caption_entities ?? []
    const entity = entities.find(item => item.type === 'bot_command' && item.offset === 0)
    if (!entity)
        return null

    const match = /^\/([a-z0-9_]+)(?:@([a-z0-9_]+))?$/i.exec(text.slice(0, entity.length))
    if (!match)
        return null

    const [, name, target] = match
    if (target && target.toLowerCase() !== botUsername.toLowerCase())
        return null

    return {
        name: name.toLowerCase(),
        args: text.slice(entity.length).trim(),
    }
}

function groupHelpText(botUsername: string, moderator: boolean): string {
    const lines = [
        'Drop your daily win:',
        '/checkin [your win] + one photo/doc (or reply to your own)',
        '',
        `🔒 Status + details: https://t.me/${botUsername} → /start`,
        '',
        '👀 Peer review (not your own):',
        '/checkin_review [ID] [approve|reject] [comment]',
        '/checkin_audit [ID] approve [comment]',
    ]

    if (moderator)
        lines.push('', '🛡️ Mods: /post_grinder_tag drops the tag button.')

    return panel('⚡ Aksaria check-ins', lines)
}

function privateHelpLines(moderator: boolean): string[] {
    const lines = [
        '/checkin_status — state + streak',
        '/checkin_details [ID] — proof + history',
        '',
        '👀 Review others (not your own):',
        '/checkin_review [ID] [approve|reject] [comment]',
        '/checkin_audit [ID] approve [comment]',
    ]

    if (moderator)
        lines.push('', '🛡️ Mod: /post_grinder_tag in the group.')

    return lines
}

function privateHelpText(moderator: boolean): string {
    return panel('⚡ Your private check-in HQ', privateHelpLines(moderator))
}

export function registerTelegramHandlers(bot: Bot, deps: TelegramDeps, onFatal: (err: Error) => void): void {
    bot.catch(() => {
        log.error('Telegram update handler failed.')
    })

    bot.on('my_chat_member', async (ctx) => {
        const update = ctx.myChatMember
        if (String(update.chat.id) !== deps.chatId)
            return
        if (hasRequiredAdminRights(update.new_chat_member))
            return

        // Pending updates may describe an older permission state. Recheck live
        // before treating the change as a fatal configuration failure.
        const current = await fetchChatMember(ctx.api, deps.chatId, deps.botId)
        if (hasRequiredAdminRights(current))
            return

        log.error('Telegram bot lost administrator, Manage Tags, or Delete Messages rights in the configured group.')
        onFatal(new Error('The Telegram bot lost administrator, Manage Tags, or Delete Messages rights in the configured group'))
    })

    bot.on('message', async (ctx) => {
        const message = ctx.message
        const from = ctx.from
        if (!message || !from || from.is_bot)
            return

        if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
            if (String(message.chat.id) !== deps.chatId || message.sender_chat)
                return

            if (message.migrate_to_chat_id) {
                log.error(`Telegram group was upgraded; configure chat id ${message.migrate_to_chat_id}.`)
                onFatal(new Error(`The Telegram group was upgraded; configure the new chat id ${message.migrate_to_chat_id}`))
                return
            }

            const command = parseCommand(message, deps.botUsername)
            if (!command)
                return

            if (command.name === 'checkin') {
                await handleCheckin(ctx, deps, command.args)
                return
            }

            if (command.name === 'checkin_status' || command.name === 'checkin_details') {
                await handleGroupPrivateLink(ctx, deps)
                return
            }

            if (command.name === 'post_grinder_tag') {
                await handlePostTag(ctx, deps)
                return
            }

            const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
            if (!isGroupMember(member))
                return

            if (command.name === 'ping') {
                await ctx.reply('🏓 Pong!')
                return
            }

            if (command.name === 'start' || command.name === 'help')
                await ctx.reply(groupHelpText(deps.botUsername, isModerator(member)), { parse_mode: 'HTML' })

            return
        }

        if (message.chat.type !== 'private' || message.chat.id !== from.id)
            return

        const command = parseCommand(message, deps.botUsername)
        if (!command)
            return

        const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
        if (!isGroupMember(member))
            return

        switch (command.name) {
            case 'start':
                await recordDmOptIn(deps.prisma, deps.chatId, String(from.id), deps.now())
                await ctx.reply(panel('🎉 You’re in!', [
                    'Private check-in access unlocked.',
                    '',
                    ...privateHelpLines(isModerator(member)),
                ]), { parse_mode: 'HTML' })
                return
            case 'help':
                await ctx.reply(privateHelpText(isModerator(member)), { parse_mode: 'HTML' })
                return
            case 'checkin_status':
                await handlePrivateStatus(ctx, deps)
                return
            case 'checkin_details':
                await handlePrivateDetails(ctx, deps, command.args)
                return
            case 'checkin_review':
                await handlePrivateReview(ctx, deps, command.args)
                return
            case 'checkin_audit':
                await handlePrivateAudit(ctx, deps, command.args)
                return
            default:
                return
        }
    })

    bot.callbackQuery(/^ci:([ar]):(.+)$/, async (ctx) => {
        const [, action, reference] = ctx.match
        await handleReviewCallback(ctx, deps, action === 'a' ? 'APPROVED' : 'REJECTED', reference)
    })
    bot.callbackQuery('tag:claim', async (ctx) => {
        await handleTagClaim(ctx, deps)
    })
    bot.on('callback_query', async (ctx) => {
        const data = ctx.callbackQuery.data
        try {
            if (data?.startsWith('ci:'))
                await ctx.answerCallbackQuery({ text: '🤔 Invalid check-in action.', show_alert: true })
            else if (data?.startsWith('tag:'))
                await ctx.answerCallbackQuery({ text: '⌛ That tag post is stale. Ask a mod for a fresh one!', show_alert: true })
            else
                await ctx.answerCallbackQuery()
        }
        catch {
            // The callback may already be too old to answer.
        }
    })
}

export function createTelegramBot(prisma: PrismaClient, env: NodeJS.ProcessEnv): BotRuntime {
    const config = parseTelegramConfig(env)
    const bot = new Bot(config.token)

    let started = false
    let stopped = false
    let stopping = false
    let failed = false
    let pollingPromise: Promise<void> | undefined
    const doneState = Promise.withResolvers<void>()

    const fail = (err: Error) => {
        if (failed)
            return

        failed = true
        doneState.reject(err)
    }

    const stop = async () => {
        if (stopped)
            return

        stopped = true
        stopping = true

        await stopTelegramJobs()
        try {
            if (bot.isRunning())
                await bot.stop()
        }
        catch {
            // Polling may already have stopped.
        }
        await pollingPromise?.catch(() => {})
        doneState.resolve()
    }

    const start = async () => {
        if (started)
            return
        started = true

        log.base('🚀 Starting Telegram bot...')

        await bot.init()
        const botInfo = bot.botInfo
        const botUsername = botInfo.username
        if (!botUsername)
            throw new Error('The Telegram bot username is unavailable')

        const chat = await bot.api.getChat(config.chatId)
        if (String(chat.id) !== config.chatId)
            throw new Error('TELEGRAM_GROUP_ID did not resolve to the configured chat')
        if (chat.type !== 'group' && chat.type !== 'supergroup')
            throw new Error('TELEGRAM_GROUP_ID must point to a group or supergroup')

        const webhook = await bot.api.getWebhookInfo()
        if (webhook.url)
            throw new Error('A Telegram webhook is configured; remove it before starting long polling')

        const botMember = await bot.api.getChatMember(config.chatId, botInfo.id)
        if (!hasRequiredAdminRights(botMember))
            throw new Error('The Telegram bot must be an administrator with Manage Tags and Delete Messages in the configured group')

        await bot.api.setMyCommands([])
        await bot.api.setMyCommands(GROUP_COMMANDS, {
            scope: { type: 'chat', chat_id: Number(config.chatId) },
        })
        await bot.api.setMyCommands(ADMIN_GROUP_COMMANDS, {
            scope: { type: 'chat_administrators', chat_id: Number(config.chatId) },
        })
        await bot.api.setMyCommands(PRIVATE_COMMANDS, {
            scope: { type: 'all_private_chats' },
        })

        const deps: TelegramDeps = {
            prisma,
            chatId: config.chatId,
            botId: botInfo.id,
            botUsername,
            memberTag: config.memberTag,
            now: () => new Date(),
        }

        registerTelegramHandlers(bot, deps, fail)

        const startState = Promise.withResolvers<void>()
        const polling = bot.start({
            allowed_updates: ['message', 'callback_query', 'my_chat_member'],
            drop_pending_updates: false,
            onStart: () => startState.resolve(),
        })
        pollingPromise = polling

        void polling.catch((err) => {
            if (stopping)
                return

            const reason = err instanceof GrammyError ? err.description : 'unknown polling error'
            log.error(`Telegram long polling stopped unexpectedly: ${reason}`)
            const error = new Error(`Telegram long polling stopped unexpectedly: ${reason}`)
            fail(error)
            startState.reject(error)
        })

        await startState.promise

        try {
            await runLossNotices(bot.api, deps, deps.now())
        }
        catch (err) {
            log.error(`Telegram loss reconciliation failed: ${err instanceof Error ? err.message : 'unknown error'}`)
        }

        startTelegramJobs(bot, deps)
        log.base('🚀 Telegram bot is running!')
    }

    return { start, stop, done: doneState.promise }
}
