import type { Event } from '@events/event'
import type { Client } from 'discord.js'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { SayHello } from '../validators/say-hello'

export class SayHelloError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SayHelloError', message, options)
    }
}

export default {
    name: Events.ClientReady,
    desc: 'Say こんにちは for the first load.',
    once: true,
    exec(client: Client) {
        try {
            console.warn(`こんにちは、${client.user?.tag}`)
        }
        catch (err: any) {
            log.error(`Failed to handle ${SayHello.ERR.UnexpectedSayHello}: ${err}`)
        }
    },
} as Event
