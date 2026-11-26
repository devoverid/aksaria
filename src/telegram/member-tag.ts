import type { TelegramDeps } from './deps'
import type { Context } from 'grammy'
import { fetchChatMember, currentMemberTag, isModerator } from './auth'
import { InlineKeyboard } from 'grammy'

export function tagPostText(tag: string): string {
    return `🎟️ Claim your member tag: ${tag}`
}

function tagKeyboard(): InlineKeyboard {
    return new InlineKeyboard().text('🎟️ Claim tag', 'tag:claim')
}

export async function handlePostTag(ctx: Context, deps: TelegramDeps): Promise<void> {
    const from = ctx.from
    const message = ctx.message
    if (!from || !message)
        return

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!isModerator(member)) {
        await ctx.reply('🛡️ Mods only — not allowed for this one!')
        return
    }

    await ctx.api.sendMessage(deps.chatId, tagPostText(deps.memberTag), {
        message_thread_id: message.message_thread_id,
        reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
        reply_markup: tagKeyboard(),
    })
}

function isCurrentTagPost(ctx: Context, deps: TelegramDeps): boolean {
    const message = ctx.callbackQuery?.message
    if (!message || message.chat.id !== Number(deps.chatId) || message.from?.id !== deps.botId)
        return false
    if (message.text !== tagPostText(deps.memberTag))
        return false

    return message.reply_markup?.inline_keyboard.some(row =>
        row.some(button => button.text === '🎟️ Claim tag' && 'callback_data' in button && button.callback_data === 'tag:claim'),
    ) ?? false
}

async function alert(ctx: Context, text: string): Promise<void> {
    try {
        await ctx.answerCallbackQuery({ text, show_alert: true })
    }
    catch {
        // The callback may already be too old to answer.
    }
}

export async function handleTagClaim(ctx: Context, deps: TelegramDeps): Promise<void> {
    const from = ctx.from
    if (!from || from.is_bot || !ctx.callbackQuery) {
        await alert(ctx, '⌛ This member tag post is no longer available.')
        return
    }

    if (!isCurrentTagPost(ctx, deps)) {
        await alert(ctx, '⌛ That tag post is stale. Ask a mod for a fresh one!')
        return
    }

    const member = await fetchChatMember(ctx.api, deps.chatId, from.id)
    if (!member || member.status !== 'member') {
        await alert(ctx, '🙅 Regular members only for this tag.')
        return
    }

    const existingTag = currentMemberTag(member)
    if (existingTag === deps.memberTag) {
        await alert(ctx, '😎 You already rock this tag!')
        return
    }
    if (existingTag) {
        await alert(ctx, '🎭 One tag at a time — you’ve already got another!')
        return
    }

    try {
        await ctx.api.setChatMemberTag(deps.chatId, from.id, deps.memberTag)
        await ctx.answerCallbackQuery({ text: `🎉 Tag unlocked: ${deps.memberTag}!` })
    }
    catch {
        await alert(ctx, '😬 Couldn’t confirm the tag. Try again in a bit!')
    }
}
