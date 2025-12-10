import type { Event } from '@events/event'
import type { Client, Interaction, TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { Checkin } from '../validators/checkin'

export class CheckinRejectButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinRejectButtonError', message, options)
    }
}

export const CHECKIN_REJECT_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

export default {
    name: Events.InteractionCreate,
    desc: 'Handles check-in reject button interactions and rejects user check-in.',
    async exec(client: Client, interaction: Interaction) {
        if (!interaction.isButton())
            return

        const isValidComponent = Checkin.assertComponentId(interaction.customId, CHECKIN_REJECT_BUTTON_ID)
        if (!isValidComponent)
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinRejectButtonError(Checkin.ERR.NotGuild)

            const { checkinId } = Checkin.getButtonId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            await Checkin.validateCheckin(
                client.prisma,
                interaction.guild,
                flamewarden,
                { key: 'id', value: checkinId },
                interaction.message,
                'REJECTED',
            )
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${CHECKIN_REJECT_BUTTON_ID}: ${Checkin.ERR.UnexpectedButton}: ${err}`)
        }
    },
} as Event
