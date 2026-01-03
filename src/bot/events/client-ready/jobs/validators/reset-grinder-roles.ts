import type { PrismaClient } from '@generatedDB/client'
import type { CheckinStatusType, Checkin as CheckinType } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { User } from '@type/user'
import type { Guild, GuildMember, Interaction, InteractionReplyOptions, Message, PublicThreadChannel, TextChannel, ThreadChannel } from 'discord.js'
import { CheckinStatus } from '@commands/checkin/validators/checkin-status'
import { FLAMEWARDEN_ROLE, getGrindRoles, GRINDER_ROLE } from '@config/discord'
import { GOODBYE_NOTE_BUTTON_ID, ResetGrinderRolesButtonError } from '@events/interaction-create/jobs/handlers/reset-grinder-roles-button'
import { decodeSnowflakes, encodeSnowflake, getCustomId } from '@utils/component'
import { isDateToday, isDateYesterday } from '@utils/date'
import { DiscordAssert, getChannel, getMembers, sendAsBot } from '@utils/discord'
import { log } from '@utils/logger'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { ResetGrinderRolesMessage } from '../messages/reset-grinder-roles'

export class ResetGrinderRoles extends ResetGrinderRolesMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]

    static async getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId, threadId] = decodeSnowflakes(customId)

        if (!guildId)
            throw new ResetGrinderRolesButtonError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new ResetGrinderRolesButtonError(this.ERR.NotGuild)
        if (!threadId)
            throw new ResetGrinderRolesButtonError(this.ERR.ThreadIdMissing)

        const thread = await getChannel(interaction.guild!, threadId, true) as ThreadChannel
        if (!thread)
            throw new ResetGrinderRolesButtonError(this.ERR.ThreadNotFound)

        return { prefix, guildId, thread }
    }

    static generateButton(guildId: string, thread: ThreadChannel): ActionRowBuilder<ButtonBuilder> {
        const noteButtonId = getCustomId([GOODBYE_NOTE_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(thread.id)])
        const noteButton = new ButtonBuilder()
            .setCustomId(noteButtonId)
            .setLabel('📜 Ketentuan Peninjauan Api')
            .setStyle(ButtonStyle.Primary)

        return new ActionRowBuilder<ButtonBuilder>().addComponents(noteButton)
    }

    static hasValidCheckin(checkin?: { created_at: Date, status: string }): boolean {
        if (!checkin)
            return false

        const { created_at, status } = checkin
        if (isDateToday(created_at))
            return true
        if (isDateYesterday(created_at) && status === 'APPROVED')
            return true

        return false
    }

    static async removeGrinderRoles(member: GuildMember) {
        await member.roles.remove(GRINDER_ROLE)

        const grindRoles = getGrindRoles()
        for (const grindRole of grindRoles) {
            if (this.isMemberHasRole(member, grindRole.id)) {
                await member.roles.remove(grindRole.id)
            }
        }
    }

    static async notifyWaitingCheckin(guild: Guild, auditFlameChannel: TextChannel, member: GuildMember, user: User, checkin: CheckinType): Promise<PublicThreadChannel | undefined> {
        if (checkin && checkin.status as CheckinStatusType === 'WAITING') {
            const { content, embed } = await CheckinStatus.getEmbedStatusContent(guild, user.discord_id, checkin)
            const message = await sendAsBot(null, auditFlameChannel, { embeds: [embed], allowedMentions: { roles: [FLAMEWARDEN_ROLE] }, content }) as Message
            await message.react(CheckinStatus.CLARIFICATION_EMOJI)

            const thread = await message.startThread({
                name: CheckinStatus.MSG.ThreadName(checkin.public_id),
                reason: CheckinStatus.MSG.ThreadReason(member.user.tag),
                autoArchiveDuration: CheckinStatus.THREAD_ARCHIVE_DURATION,
            })
            await thread.send({ content: CheckinStatus.MSG.ThreadContent(user.discord_id, checkin) })

            return thread
        }
    }

    static async validateUsers(prisma: PrismaClient, guild: Guild, grindAshesChannel: TextChannel, auditFlameChannel: TextChannel, users: User[]) {
        const discordIds = users.map(u => u.discord_id).filter(Boolean)
        const members = await getMembers(guild, discordIds, { withPresences: false })

        for (const user of users) {
            const checkinStreak = user.checkin_streaks?.[0]
            if (!checkinStreak)
                continue

            const lastCheckin = checkinStreak.checkins?.[0]
            if (this.hasValidCheckin(lastCheckin))
                continue

            const member = members.get(user.discord_id) as GuildMember
            if (!member)
                continue

            await this.removeGrinderRoles(member)
            await this.breakCheckinStreakAt(prisma, checkinStreak, lastCheckin!)
            const thread = await this.notifyWaitingCheckin(guild, auditFlameChannel, member, user, lastCheckin!)

            const payloads: InteractionReplyOptions = {
                content: ResetGrinderRoles.MSG.GoodBye(guild.name, member),
                allowedMentions: { users: [member.id], roles: [] },
            }
            if (thread)
                payloads.components = [this.generateButton(guild.id, thread)]

            await sendAsBot(
                null,
                grindAshesChannel,
                payloads,
            )

            log.info(this.MSG.RemoveGrinderRoleFrom(member))
        }
    }

    static async getUsersWithLatestStreak(prisma: PrismaClient): Promise<User[]> {
        const users = await prisma.user.findMany({
            select: {
                discord_id: true,
                checkin_streaks: {
                    orderBy: { first_date: 'desc' },
                    take: 1,
                    where: {
                        streak_broken_at: null,
                    },
                    include: {
                        checkins: {
                            orderBy: { created_at: 'desc' },
                            take: 1,
                            include: { checkin_streak: true },
                        },
                    },
                },
            },
        }) as User[]

        return users
    }

    static async breakCheckinStreakAt(prisma: PrismaClient, checkinStreak: CheckinStreak, checkin: CheckinType) {
        const streak = await prisma.checkinStreak.update({
            where: { id: checkinStreak.id },
            data: {
                streak_broken_at: new Date(),
                updated_at: new Date(),
            },
        }) as CheckinStreak

        checkin.checkin_streak = streak
    }
}
