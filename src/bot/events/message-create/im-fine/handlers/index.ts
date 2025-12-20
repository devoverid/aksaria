import { EVENT_PATH } from '@events/index'
import { registerMessageHandler } from '@events/message-create/registry'
import { generateCustomId } from '@utils/component'
import { DiscordBaseError } from '@utils/discord/error'
import { ImFine } from '../validators'

export class ImFineError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ImFineError', message, options)
    }
}

export const IM_FINE_ID = generateCustomId(EVENT_PATH, __filename)

registerMessageHandler({
    desc: 'Replying to a user when the user\'s chat contains \'fine\' word.',
    id: IM_FINE_ID,
    errorTag: () => `${IM_FINE_ID}: ${ImFine.ERR.UnexpectedImFine}`,
    match: msg => !msg.author.bot && msg.content.includes('fine'),
    async exec(_, msg) {
        await msg.reply('gua I\'m fine😅')
    },
})
