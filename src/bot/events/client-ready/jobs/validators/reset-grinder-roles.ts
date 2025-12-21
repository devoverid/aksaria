import type { PrismaClient } from '@generatedDB/client'
import type { CheckinStreak } from '@type/checkin-streak'
import type { User } from '@type/user'
import type { Guild, GuildMember, Interaction, TextChannel } from 'discord.js'
import { getGrindRoles, GRINDER_ROLE } from '@config/discord'
import { GOODBYE_NOTE_BUTTON_ID, ResetGrinderRolesButtonError } from '@events/interaction-create/jobs/handlers/reset-grinder-roles-button'
import { decodeSnowflakes, encodeSnowflake, getCustomId } from '@utils/component'
import { isDateToday, isDateYesterday } from '@utils/date'
import { DiscordAssert, sendAsBot } from '@utils/discord'
import { log } from '@utils/logger'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { ResetGrinderRolesMessage } from '../messages/reset-grinder-roles'

export class ResetGrinderRoles extends ResetGrinderRolesMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]

    static getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId] = decodeSnowflakes(customId)

        if (!guildId)
            throw new ResetGrinderRolesButtonError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new ResetGrinderRolesButtonError(this.ERR.NotGuild)

        return { prefix, guildId }
    }

    static generateButton(guildId: string): ActionRowBuilder<ButtonBuilder> {
        const noteButtonId = getCustomId([GOODBYE_NOTE_BUTTON_ID, encodeSnowflake(guildId)])
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
            if (member.roles.cache.has(grindRole.id)) {
                await member.roles.remove(grindRole.id)
            }
        }
    }

    static async validateUsers(prisma: PrismaClient, guild: Guild, channel: TextChannel, users: User[]) {
        for (const user of users) {
            const checkinStreak = user.checkin_streaks?.[0]
            if (!checkinStreak)
                continue

            const lastCheckin = checkinStreak.checkins?.[0]
            if (this.hasValidCheckin(lastCheckin))
                continue

            const member = await guild.members.fetch(user.discord_id)
            await this.removeGrinderRoles(member)
            await this.breakCheckinStreakAt(prisma, checkinStreak)
            const button = this.generateButton(guild.id)

            await sendAsBot(
                null,
                channel,
                { content: ResetGrinderRoles.MSG.GoodBye(member), components: [button], allowedMentions: { users: [member.id], roles: [] } },
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
                        },
                    },
                },
            },
        }) as User[]

        return users
    }

    static async breakCheckinStreakAt(prisma: PrismaClient, checkinStreak: CheckinStreak) {
        await prisma.checkinStreak.update({
            where: { id: checkinStreak.id },
            data: {
                streak_broken_at: new Date(),
                updated_at: new Date(),
            },
        })
    }
}
