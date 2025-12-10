import type { Event } from '@events/event'
import type { Attachment, Interaction } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { generateCustomId, tempStore } from '@utils/component'
import { getChannel, sendAsBot, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { Send } from '../validators/send'

export class SendModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SendModalError', message, options)
    }
}

export const MESSAGE_SEND_ID = generateCustomId(EVENT_PATH, __filename)

export default {
    name: Events.InteractionCreate,
    desc: 'Handles modal submissions for creating an embed with a role-grant button.',
    async exec(_, interaction: Interaction) {
        if (!interaction.isModalSubmit())
            return

        const isValidComponent = Send.assertComponentId(interaction.customId, MESSAGE_SEND_ID)
        if (!isValidComponent)
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
            else log.error(`Failed to handle ${MESSAGE_SEND_ID}: ${Send.ERR.UnexpectedModal}: ${err}`)
        }
    },
} as Event
