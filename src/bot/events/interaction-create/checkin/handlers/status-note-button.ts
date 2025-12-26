import type { TextChannel } from 'discord.js'
import { CheckinStatus } from '@commands/checkin/validators/checkin-status'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { messageLink } from 'discord.js'
import { Checkin } from '../validators'

export class CheckinStatusNoteButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinStatusNoteButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_STATUS_NOTE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Opens a note about how to request clarification for the last check-in if the streak was broken and did not reviewed.',
    id: CHECKIN_STATUS_NOTE_BUTTON_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(_, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinStatusNoteButtonError(Checkin.ERR.NotGuild)

            const { checkinLink } = CheckinStatus.getButtonId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.client.user, channel)

            const statusMessageLink = messageLink(interaction.channelId, interaction.message.id, interaction.guildId)

            await sendReply(interaction, CheckinStatus.MSG.LastCheckinNote(checkinLink, statusMessageLink))
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
