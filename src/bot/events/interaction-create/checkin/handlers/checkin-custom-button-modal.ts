import type { Event } from '@events/event'
import type { CheckinStatusType } from '@type/checkin'
import type { Client, Interaction, TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { Checkin } from '../validators/checkin'

export class CheckinCustomButtonModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinCustomButtonModalError', message, options)
    }
}

export const CHECKIN_CUSTOM_BUTTON_MODAL_ID = generateCustomId(EVENT_PATH, __filename)

export default {
    name: Events.InteractionCreate,
    desc: 'Handles modal submissions for the custom check-in review modal.',
    async exec(client: Client, interaction: Interaction) {
        if (!interaction.isModalSubmit())
            return

        const isValidComponent = Checkin.assertComponentId(interaction.customId, CHECKIN_CUSTOM_BUTTON_MODAL_ID)
        if (!isValidComponent)
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
            else log.error(`Failed to handle ${CHECKIN_CUSTOM_BUTTON_MODAL_ID}: ${Checkin.ERR.UnexpectedModal}: ${err}`)
        }
    },
} as Event
