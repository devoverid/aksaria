import type { CheckinStatusType } from '@type/checkin'
import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'

export class CheckinCustomButtonModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinCustomButtonModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_CUSTOM_BUTTON_MODAL_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles modal submissions for the custom check-in review modal.',
    id: CHECKIN_CUSTOM_BUTTON_MODAL_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedModal}`,
    async exec(client, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinCustomButtonModalError(Checkin.ERR.NotGuild)

            const { checkinId, messageId } = Checkin.getModalReviewId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)
            const message = await channel.messages.fetch(messageId)

            const status = interaction.fields.getStringSelectValues('status')[0] as CheckinStatusType
            const comment = interaction.fields.getTextInputValue('comment')

            await Checkin.validateCheckin(
                client.prisma,
                interaction.guild,
                flamewarden,
                { key: 'id', value: checkinId },
                message,
                status,
                comment,
            )
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
