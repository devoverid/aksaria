import type { CheckinStatusType } from '@discord/types/checkin'
import type { ThreadChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@discord/config/discord'
import { EVENT_PATH } from '@discord/events/index'
import { registerInteractionHandler } from '@discord/events/interaction-create/registry'
import { createEmbed, generateCustomId } from '@discord/utils/component'
import { getMember, sendReply } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { DUMMY } from '@discord/utils/placeholder'
import { Checkin } from '../validators'
import { CheckinAudit } from '../validators/audit'

export class CheckinAuditModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinAuditModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_AUDIT_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles modal submissions for check-in audit modal forms.',
    id: CHECKIN_AUDIT_ID,
    errorTag: () => `${moduleName}: ${CheckinAudit.ERR.UnexpectedModal}`,
    async exec(client, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinAuditModalError(CheckinAudit.ERR.NotGuild)

            const { checkinId, checkinCreatedAt } = CheckinAudit.getModalReviewId(interaction, interaction.customId)

            const thread = interaction.channel as ThreadChannel
            const threadMsg = await CheckinAudit.getThreadMessage(thread)
            const flamewarden = await getMember(interaction.guild, interaction.member.id)
            CheckinAudit.assertMember(flamewarden)
            CheckinAudit.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const status: CheckinStatusType = 'APPROVED'
            const comment = interaction.fields.getTextInputValue('comment')

            const updatedCheckin = await Checkin.validateCheckin(
                client,
                interaction.guild,
                flamewarden,
                { key: 'public_id', value: checkinId },
                checkinCreatedAt,
                status,
                comment,
                true,
            )

            const embed = createEmbed(
                `🔥 Audit Check-In Telah Diselesaikan`,
                CheckinAudit.MSG.AuditSuccess(interaction.guild.name, updatedCheckin.link!, flamewarden.id, updatedCheckin.user!.discord_id),
                DUMMY.COLOR,
                { text: DUMMY.FOOTER(interaction.guild.name) },
            )

            await sendReply(interaction, '', false, { embeds: [embed], allowedMentions: { users: [updatedCheckin.user!.discord_id] } })
            await CheckinAudit.closeClarificationThread(thread, threadMsg)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
