import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { Checkin } from '../validators'

export class CheckinApproveButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinApproveButtonError', message, options)
    }
}

export const CHECKIN_APPROVE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Approves a user check-in from the approve button.',
    id: CHECKIN_APPROVE_BUTTON_ID,
    errorTag: () => `${CHECKIN_APPROVE_BUTTON_ID}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(client, interaction) {
        if (!interaction.isButton())
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinApproveButtonError(Checkin.ERR.NotGuild)

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
                'APPROVED',
            )
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
