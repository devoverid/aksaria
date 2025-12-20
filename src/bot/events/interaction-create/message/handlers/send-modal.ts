import type { Attachment } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId, tempStore } from '@utils/component'
import { getChannel, sendAsBot, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { Send } from '../validators/send'

export class SendModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SendModalError', message, options)
    }
}

export const MESSAGE_SEND_ID = generateCustomId(EVENT_PATH, __filename)

registerInteractionHandler({
    desc: 'Handles message send modal submissions, posting messages (text/attachments) as the bot in the selected channel.',
    id: MESSAGE_SEND_ID,
    errorTag: () => `${MESSAGE_SEND_ID}: ${Send.ERR.UnexpectedModal}`,
    async exec(_, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new SendModalError(Send.ERR.NotGuild)

            const { channelId, tempToken } = Send.getModalId(interaction, interaction.customId)
            const channel = await getChannel(interaction.guild, channelId)
            Send.assertChannel(channel)
            Send.assertMissPerms(interaction.client.user, channel)
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
