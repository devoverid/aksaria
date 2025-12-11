import type { Event } from '@events/event'
import type { CheckinStatusType } from '@type/checkin'
import type { Client, Interaction, TextChannel } from 'discord.js'
import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { Checkin } from '../validators/checkin'
import { CheckinAudit } from '../validators/checkin-audit'

export class CheckinAuditModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinAuditModalError', message, options)
    }
}

export const CHECKIN_AUDIT_ID = generateCustomId(EVENT_PATH, __filename)

export default {
    name: Events.InteractionCreate,
    desc: 'Handles modal submissions for check-in audit modal forms.',
    async exec(client: Client, interaction: Interaction) {
        if (!interaction.isModalSubmit())
            return

        const isValidComponent = CheckinAudit.assertComponentId(interaction.customId, CHECKIN_AUDIT_ID)
        if (!isValidComponent)
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinAuditModalError(CheckinAudit.ERR.NotGuild)

            const { checkinId } = CheckinAudit.getModalReviewId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            const checkinChannel = await interaction.client.channels.fetch(CHECKIN_CHANNEL) as TextChannel
            CheckinAudit.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            CheckinAudit.assertMember(flamewarden)
            CheckinAudit.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const status: CheckinStatusType = 'APPROVED'
            const comment = interaction.fields.getTextInputValue('comment')

            const checkin = await Checkin.getWaitingCheckin(client.prisma, 'public_id', checkinId)
            const updatedCheckin = await Checkin.updateCheckinStatus(client.prisma, flamewarden, checkin, status, comment, true)
            await Checkin.validateCheckinHandleToUser(interaction.guild, flamewarden, checkin.user!.discord_id, updatedCheckin)

            const { messageId } = CheckinAudit.getMessageFromLink(checkin.link!)
            const message = await checkinChannel.messages.fetch(messageId)
            await Checkin.validateCheckinHandleSubmittedMsg(message, updatedCheckin, status)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${CHECKIN_AUDIT_ID}: ${CheckinAudit.ERR.UnexpectedModal}: ${err}`)
        }
    },
} as Event
