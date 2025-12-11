import type { PrismaClient } from '@generatedDB/client'
import type { Interaction } from 'discord.js'
import { CheckinAuditError } from '@commands/checkin/handlers/checkin-audit'
import { decodeSnowflakes } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { PermissionsBitField } from 'discord.js'
import { CheckinAuditModalError } from '../handlers/checkin-audit-modal'
import { CheckinAuditMessage } from '../messages/checkin-audit'

export class CheckinAudit extends CheckinAuditMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static getModalReviewId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinId] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinAuditModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinAuditModalError(this.ERR.NotGuild)
        if (!checkinId)
            throw new CheckinAuditModalError(this.ERR.CheckinIdMissing)

        return { prefix, guildId, checkinId }
    }

    static async assertExistCheckinId(prisma: PrismaClient, checkinId: string) {
        const checkin = await prisma.checkin.findUnique({ where: { public_id: checkinId } })
        if (!checkin) {
            throw new CheckinAuditError(this.ERR.CheckinIdInvalid)
        }

        return checkin
    }
}
