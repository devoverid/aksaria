import type { Attachment, TextChannel } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId, tempStore } from '@utils/component'
import { getBot, getChannel, sendAsBot, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Send } from '../validators/send'

export class SendModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SendModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const MESSAGE_SEND_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles message send modal submissions, posting messages (text/attachments) as the bot in the selected channel.',
    id: MESSAGE_SEND_ID,
    errorTag: () => `${moduleName}: ${Send.ERR.UnexpectedModal}`,
    async exec(_, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new SendModalError(Send.ERR.NotGuild)

            const { channelId, tempToken } = Send.getModalId(interaction, interaction.customId)
            const channel = await getChannel(interaction.guild, channelId) as TextChannel
            Send.assertChannel(channel)
            const bot = await getBot(interaction.guild)
            Send.assertMissPerms(bot, channel)
            const attachments = tempStore.get(tempToken) as Attachment[]
            Send.delTempItem(attachments, tempToken)

            const message = interaction.fields.getTextInputValue('message')
            Send.assertNotEmpty(attachments, message)

            await sendAsBot(interaction, channel, {
                content: message.length ? message : undefined,
                files: attachments.length ? attachments : undefined,
                allowedMentions: { parse: [] },
            }, false, true, true)
            await sendReply(interaction, '✅ Message sent~')
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
