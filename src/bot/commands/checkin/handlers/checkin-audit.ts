import type { Command } from '@commands/command'
import type { ChatInputCommandInteraction, Client } from 'discord.js'
import { AUDIT_FLAME_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { CHECKIN_AUDIT_ID } from '@events/interaction-create/checkin/handlers/checkin-audit-modal'
import { createCheckinReviewModal, encodeSnowflake, getCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { SlashCommandBuilder } from 'discord.js'
import { CheckinAudit } from '../../../events/interaction-create/checkin/validators/checkin-audit'

export class CheckinAuditError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinAuditError', message, options)
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('checkin-audit')
        .setDescription('Review an old check-in using its public ID.')
        .addStringOption(opt =>
            opt.setName('checkin-id')
                .setDescription('Check-In ID (e.g., CHK-A1B2C3)')
                .setRequired(true),
        ),

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.inCachedGuild())
                throw new CheckinAuditError(CheckinAudit.ERR.NotGuild)

            const channel = await CheckinAudit.assertAllowedChannel(interaction.guild, interaction.channelId, AUDIT_FLAME_CHANNEL)
            CheckinAudit.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            CheckinAudit.assertMember(flamewarden)
            CheckinAudit.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const checkinId = interaction.options.getString('checkin-id', true)
            const checkin = await CheckinAudit.assertExistCheckinId(client.prisma, checkinId)
            CheckinAudit.assertCheckinNotToday(checkin)
            const checkins = await CheckinAudit.getOldestWaitingCheckins(client.prisma, checkin.checkin_streak_id)
            CheckinAudit.assertCheckinWithOldestWaiting(checkin, checkins)

            const modalCustomId = getCustomId([
                CHECKIN_AUDIT_ID,
                encodeSnowflake(interaction.guildId),
                checkinId,
            ])
            const modal = createCheckinReviewModal(modalCustomId, checkin, false)

            await interaction.showModal(modal)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message, true)
            else log.error(`Failed to handle: ${CheckinAudit.ERR.UnexpectedCheckinAudit}: ${err}`)
        }
    },
} as Command
