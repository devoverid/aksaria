import type { Client } from 'discord.js'
import { registerClientReadyHandler } from '@discord/events/client-ready/registry'
import { EVENT_PATH } from '@discord/events/index'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { SayHello } from '../validators'

export class SayHelloError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SayHelloError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerClientReadyHandler({
    desc: 'Say こんにちは for the first load.',
    errorTag: () => `${moduleName}: ${SayHello.ERR.UnexpectedSayHello}`,
    exec(client: Client) {
        console.warn(`こんにちは、${client.user?.tag}`)
    },
})
