import type { PrismaClient } from '@generatedDB/client'
import type { Checkin } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { Interaction } from 'discord.js'
import { CheckinAuditError } from '@commands/checkin/handlers/checkin-audit'
import { decodeSnowflakes } from '@utils/component'
import { isDateToday } from '@utils/date'
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

    static assertCheckinNotToday(checkin: Checkin) {
        if (isDateToday(checkin.created_at)) {
            throw new CheckinAuditError(CheckinAudit.ERR.CheckinShouldNotToday(checkin.link!))
        }
    }

    static assertCheckinWithOldestWaiting(currCheckin: Checkin, checkins: Checkin[]) {
        const oldestWaitingCheckin = checkins[0]

        const diffMs = Math.abs(currCheckin.created_at.getTime() - oldestWaitingCheckin.created_at.getTime())
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffDays > 0) {
            let waitingCheckinList = ``
            for (const [idx, checkin] of checkins.entries()) {
                if (idx === 0) {
                    waitingCheckinList += `
[#1](${checkin.link}) *<- validate this check-in first*
\`\`\`bash
${checkin.public_id}
\`\`\``
                }
                else {
                    waitingCheckinList += `
[#${idx + 1}](${checkin.link})
\`\`\`bash
${checkin.public_id}
\`\`\``
                }
            }
            throw new CheckinAuditError(CheckinAudit.ERR.CheckinNotDiffWithinDay(oldestWaitingCheckin, waitingCheckinList))
        }
    }

    static async assertExistCheckinId(prisma: PrismaClient, checkinId: string) {
        const checkin = await prisma.checkin.findUnique({
            where: { public_id: checkinId },
            include: { user: true },
        })
        if (!checkin) {
            throw new CheckinAuditError(this.ERR.CheckinIdInvalid)
        }

        return checkin
    }

    static async getOldestWaitingCheckins(prisma: PrismaClient, checkinStreakId: number): Promise<Checkin[]> {
        const checkinStreak = await prisma.checkinStreak.findFirst({
            where: {
                id: checkinStreakId,
            },
            select: {
                id: true,
                updated_at: true,
                checkins: {
                    where: {
                        status: 'WAITING',
                        reviewed_by: null,
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
        }) as CheckinStreak

        return checkinStreak.checkins!
    }
}
