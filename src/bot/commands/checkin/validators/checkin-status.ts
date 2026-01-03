import type { PrismaClient } from '@generatedDB/client'
import type { CheckinStatusType, Checkin as CheckinType, ResolvedCheckinState } from '@type/checkin'
import type { User } from '@type/user'
import type { EmbedBuilder, Guild, Interaction, ThreadAutoArchiveDuration } from 'discord.js'
import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { Checkin } from '@events/interaction-create/checkin/validators'
import { createEmbed, decodeSnowflakes } from '@utils/component'
import { isDateYesterday } from '@utils/date'
import { DiscordAssert, getMember } from '@utils/discord'
import { DUMMY } from '@utils/placeholder'
import { messageLink, PermissionsBitField } from 'discord.js'
import { CheckinStatusError } from '../handlers/checkin-status'
import { CheckinStatusMessage } from '../messages/checkin-status'

export class CheckinStatus extends CheckinStatusMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static CLARIFICATION_EMOJI = '❓'

    static override THREAD_ARCHIVE_DURATION: ThreadAutoArchiveDuration = 1440

    static getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinMessageId] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinStatusError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinStatusError(this.ERR.NotGuild)
        if (!checkinMessageId)
            throw new CheckinStatusError(this.ERR.CheckinIdMissing)

        const checkinLink = messageLink(CHECKIN_CHANNEL, checkinMessageId, interaction.guildId)

        return { prefix, guildId, checkinLink }
    }

    static resolveCheckinState(checkin?: CheckinType): ResolvedCheckinState {
        if (!checkin)
            return { type: 'NO_CHECKIN' }

        const hasToday = Checkin.hasCheckinToday(checkin.checkin_streak, checkin)
        if (hasToday) {
            switch (checkin.status) {
                case 'WAITING': return { type: 'WAITING' }
                case 'APPROVED': return { type: 'APPROVED' }
                default: return { type: 'REJECTED' }
            }
        }

        if (checkin.status === 'APPROVED' && isDateYesterday(checkin.created_at))
            return { type: 'NO_CHECKIN' }

        return { type: 'LAST_CHECKIN' }
    }

    static async getEmbedStatusContent(guild: Guild, userDiscordId: string, checkin?: CheckinType) {
        let content = ''
        let embed: EmbedBuilder

        const checkinStreak = checkin?.checkin_streak
        const hasCheckedInToday = Checkin.hasCheckinToday(checkinStreak, checkin)

        if (checkin && hasCheckedInToday) {
            const flamewarden = await getMember(guild, checkin.reviewed_by!)

            switch (checkin.status as CheckinStatusType) {
                case 'WAITING': {
                    content = `<@&${FLAMEWARDEN_ROLE}>`
                    embed = createEmbed(
                        `🧭 Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.WaitingCheckin(userDiscordId, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER(guild.name) },
                    )
                    break
                }

                case 'APPROVED': {
                    embed = createEmbed(
                        `🔥 Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.ApprovedCheckin(userDiscordId, flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER(guild.name) },
                    )
                    break
                }

                default: {
                    embed = createEmbed(
                        `❌ Check-In #${checkin.public_id}`,
                        CheckinStatus.MSG.RejectedCheckin(userDiscordId, flamewarden, checkin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER(guild.name) },
                    )
                    break
                }
            }

            return { content, embed }
        }

        const shouldShowNoCheckin = !checkin || (checkin.status === 'APPROVED' && isDateYesterday(checkin.created_at))
        if (shouldShowNoCheckin) {
            embed = createEmbed(
                `🧐 Check-In`,
                CheckinStatus.MSG.NoCheckin(userDiscordId, checkinStreak),
                DUMMY.COLOR,
                { text: DUMMY.FOOTER(guild.name) },
            )

            return { content, embed }
        }

        const flamewarden = checkin.reviewed_by ? await getMember(guild, checkin.reviewed_by) : undefined
        embed = createEmbed(
            `🕯️ Check-In #${checkin.public_id}`,
            CheckinStatus.MSG.LastCheckin(guild.name, userDiscordId, checkin, flamewarden),
            DUMMY.COLOR,
            { text: DUMMY.FOOTER(guild.name) },
        )

        return { content, embed }
    }

    static async getUser(prisma: PrismaClient, userDiscordId: string): Promise<User> {
        const user = await prisma.user.findFirst({
            where: {
                discord_id: userDiscordId,
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

        await Checkin.setAttachments(prisma, user?.checkins?.[0])

        return user
    }
}
