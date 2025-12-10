import type { PrismaClient } from '@generatedDB/client'
import type { Checkin as CheckinType } from '@type/checkin'
import type { User } from '@type/user'
import type { EmbedBuilder, Guild } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { Checkin } from '@events/interaction-create/checkin/validators/checkin'
import { createEmbed } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { DUMMY } from '@utils/placeholder'
import { PermissionsBitField } from 'discord.js'
import { CheckinStatusMessage } from '../messages/checkin-status'

export class CheckinStatus extends CheckinStatusMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static async getEmbedStatusContent(guild: Guild, discordUserId: string, checkin: CheckinType | undefined) {
        let content = ''
        let embed: EmbedBuilder
        const checkinStreak = checkin?.checkin_streak

        const hasCheckedInToday = Checkin.hasCheckinToday(checkinStreak, checkin)
        if (hasCheckedInToday && checkin) {
            const flamewarden = await guild.members.fetch(checkin.reviewed_by!)

            switch (checkin.status) {
                case 'WAITING':
                    content = `<@&${FLAMEWARDEN_ROLE}>`
                    embed = createEmbed(
                        `🧭 Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.WaitingCheckin(discordUserId, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break

                case 'APPROVED':
                    embed = createEmbed(
                        `🔥 Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.ApprovedCheckin(discordUserId, flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break

                default:
                    embed = createEmbed(
                        `❌ Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.RejectedCheckin(discordUserId, flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break
            }
        }
        else {
            embed = createEmbed(
                `🧐 Check-In`,
                CheckinStatus.MSG.NoCheckin(discordUserId, checkinStreak),
                DUMMY.COLOR,
                { text: DUMMY.FOOTER },
            )
        }

        return { content, embed }
    }

    static async getUser(prisma: PrismaClient, discordUserId: string): Promise<User> {
        const user = await prisma.user.findFirst({
            where: {
                discord_id: discordUserId,
            },
            select: {
                id: true,
                discord_id: true,
                created_at: true,
                updated_at: true,
                checkins: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    include: { checkin_streak: true },
                },
            },
        }) as User

        return user
    }
}
