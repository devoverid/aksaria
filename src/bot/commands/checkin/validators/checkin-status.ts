import type { PrismaClient } from '@generatedDB/client'
import type { CheckinStatusEmbedContent, Checkin as CheckinType, ResolvedCheckinState } from '@type/checkin'
import type { User } from '@type/user'
import type { Guild, GuildMember, Interaction, ThreadAutoArchiveDuration } from 'discord.js'
import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { Checkin } from '@events/interaction-create/checkin/validators'
import { createEmbed, decodeSnowflakes } from '@utils/component'
import { isDateYesterday } from '@utils/date'
import { DiscordAssert } from '@utils/discord'
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

    static async getEmbedStatusContent(guild: Guild, userDiscordId: string, checkin?: CheckinType, reviewer?: GuildMember | null): Promise<CheckinStatusEmbedContent> {
        const state = this.resolveCheckinState(checkin)
        const footer = { text: DUMMY.FOOTER(guild.name) }

        switch (state.type) {
            case 'WAITING':
                return {
                    content: `<@&${FLAMEWARDEN_ROLE}>`,
                    embed: createEmbed(
                        `🧭 Check-In #${checkin!.public_id}`,
                        this.MSG.WaitingCheckin(userDiscordId, checkin!),
                        DUMMY.COLOR,
                        footer,
                    ),
                }

            case 'APPROVED':
                return {
                    embed: createEmbed(
                        `🔥 Check-In #${checkin!.public_id}`,
                        this.MSG.ApprovedCheckin(userDiscordId, reviewer!, checkin!),
                        DUMMY.COLOR,
                        footer,
                    ),
                }

            case 'REJECTED':
                return {
                    embed: createEmbed(
                        `❌ Check-In #${checkin!.public_id}`,
                        this.MSG.RejectedCheckin(userDiscordId, reviewer!, checkin!),
                        DUMMY.COLOR,
                        footer,
                    ),
                }

            case 'LAST_CHECKIN':
                return {
                    embed: createEmbed(
                        `🕯️ Check-In #${checkin!.public_id}`,
                        this.MSG.LastCheckin(
                            guild.name,
                            userDiscordId,
                            checkin!,
                            reviewer,
                        ),
                        DUMMY.COLOR,
                        footer,
                    ),
                }

            case 'NO_CHECKIN':
                return {
                    embed: createEmbed(
                        `🧐 Check-In`,
                        this.MSG.NoCheckin(userDiscordId, checkin?.checkin_streak),
                        DUMMY.COLOR,
                        footer,
                    ),
                }
        }
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
