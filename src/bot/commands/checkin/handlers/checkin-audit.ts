import type { ChatInputCommandInteraction, Client, TextChannel } from 'discord.js'
import { registerCommand } from '@commands/registry'
import { AUDIT_FLAME_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { CHECKIN_AUDIT_ID } from '@events/interaction-create/checkin/handlers/audit-modal'
import { createCheckinReviewModal, encodeSnowflake, getCustomId } from '@utils/component'
import { getBot, getChannel, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { SlashCommandBuilder } from 'discord.js'
import { CheckinAudit } from '../../../events/interaction-create/checkin/validators/audit'

export class CheckinAuditError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinAuditError', message, options)
    }
}

registerCommand({
    data: new SlashCommandBuilder()
        .setName('checkin-audit')
        .setDescription('Review an old check-in using its public ID.'),

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.inCachedGuild())
                throw new CheckinAuditError(CheckinAudit.ERR.NotGuild)

            const channel = await getChannel(interaction.guild, AUDIT_FLAME_CHANNEL) as TextChannel
            CheckinAudit.assertTextChannel(channel)
            const bot = await getBot(interaction.guild)
            CheckinAudit.assertMissPerms(bot, channel)
            const thread = await CheckinAudit.assertThreadUnderChannel(interaction.guild, interaction.channelId, channel)
            CheckinAudit.assertNotArchivedThread(thread)
            CheckinAudit.assertNotPrivateThread(thread)
            const threadMsg = await CheckinAudit.getThreadMessage(thread)
            CheckinAudit.assertThreadMessageSendBy(threadMsg, interaction.client.user.id)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            CheckinAudit.assertMember(flamewarden)
            CheckinAudit.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const checkinId = CheckinAudit.assertCheckinIdFromThread(thread, threadMsg)
            const checkin = await CheckinAudit.assertExistCheckinId(client.prisma, checkinId)
            CheckinAudit.assertClarificationThread(thread, checkin.public_id)
            CheckinAudit.assertCheckinNotToday(checkin)
            const checkins = await CheckinAudit.getOldestWaitingCheckins(client.prisma, checkin.checkin_streak_id)
            CheckinAudit.assertCheckinWithOldestWaiting(checkin, checkins)

            const modalCustomId = getCustomId([
                CHECKIN_AUDIT_ID,
                encodeSnowflake(interaction.guildId),
                checkinId,
                checkin.created_at.getTime().toString(),
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
})
