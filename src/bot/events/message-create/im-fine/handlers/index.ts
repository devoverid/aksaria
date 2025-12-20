import type { Event } from '@events/event'
import type { Message } from 'discord.js'
import { DiscordBaseError } from '@utils/discord/error'
import { Events } from 'discord.js'

export class ImFineError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ImFineError', message, options)
    }
}

export default {
    name: Events.MessageCreate,
    desc: 'Replying to a user when the user\'s chat contains \'fine\' word.',
    async exec(_, msg: Message) {
        if (!msg.author.bot && msg.content.includes('fine'))
            await msg.reply('gua i\'m fine😅')
    },
} as Event
