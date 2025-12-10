import type { PrismaClient } from '@generatedDB/client'
import type { Checkin as CheckinType } from '@type/checkin'
import type { User } from '@type/user'
import type { EmbedBuilder, Guild, GuildMember } from 'discord.js'
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

    static async getEmbedStatusContent(guild: Guild, member: GuildMember, checkin: CheckinType | undefined) {
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
                        '🧭 Daily Check-In Status',
                        CheckinStatus.MSG.WaitingCheckin(member, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break

                case 'APPROVED':
                    embed = createEmbed(
                        '🔥 Daily Check-In Status',
                        CheckinStatus.MSG.ApprovedCheckin(flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break

                default:
                    embed = createEmbed(
                        '❌ Daily Check-In Status',
                        CheckinStatus.MSG.RejectedCheckin(member, flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                    break
            }
        }
        else {
            embed = createEmbed(
                '🧐 Daily Check-In Status',
                CheckinStatus.MSG.NoCheckin(member, checkinStreak),
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
