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

            const channel = interaction.channel as TextChannel
            CheckinAudit.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
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

            await sendReply(interaction, CheckinAudit.MSG.AuditSuccess(updatedCheckin.link!, updatedCheckin.user!.discord_id), false)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
