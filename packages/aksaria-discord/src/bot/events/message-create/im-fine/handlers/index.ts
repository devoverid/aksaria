import { EVENT_PATH } from '@events/index'
import { registerMessageHandler } from '@events/message-create/registry'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { ImFine } from '../validators'

export class ImFineError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ImFineError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerMessageHandler({
    desc: 'Replying to a user when the user\'s chat contains \'fine\' word.',
    errorTag: () => `${moduleName}: ${ImFine.ERR.UnexpectedImFine}`,
    match: msg => !msg.author.bot && msg.content.includes('fine'),
    async exec(_, msg) {
        await msg.reply('gua I\'m fine😅')
    },
})
