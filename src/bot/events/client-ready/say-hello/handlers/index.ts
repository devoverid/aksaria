import type { Client } from 'discord.js'
import { registerClientReadyHandler } from '@events/client-ready/registry'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { DiscordBaseError } from '@utils/discord/error'
import { SayHello } from '../validators'

export class SayHelloError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SayHelloError', message, options)
    }
}

export const SAY_HELLO_ID = generateCustomId(EVENT_PATH, __filename)

registerClientReadyHandler({
    id: SAY_HELLO_ID,
    desc: 'Say こんにちは for the first load.',
    errorTag: () => `${SAY_HELLO_ID}: ${SayHello.ERR.UnexpectedSayHello}`,
    exec(client: Client) {
        console.warn(`こんにちは、${client.user?.tag}`)
    },
})
