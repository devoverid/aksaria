import type { PrismaClient } from '@generatedDB/client'
import type { CheckinStreak } from '@type/checkin-streak'
import type { User } from '@type/user'
import type { Guild, GuildMember, TextChannel } from 'discord.js'
import { getGrindRoles, GRINDER_ROLE } from '@config/discord'
import { isDateToday, isDateYesterday } from '@utils/date'
import { sendAsBot } from '@utils/discord'
import { log } from '@utils/logger'
import { ResetGrinderRolesMessage } from '../messages/reset-grinder-roles'

export class ResetGrinderRoles extends ResetGrinderRolesMessage {
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
            const lastCheckin = user.checkins?.[0]
            if (this.hasValidCheckin(lastCheckin))
                continue

            const checkinStreak = user.checkin_streaks?.[0]
            if (!checkinStreak)
                continue

            const member = await guild.members.fetch(user.discord_id)
            await this.removeGrinderRoles(member)
            await this.breakCheckinStreakAt(prisma, checkinStreak)

            await sendAsBot(
                null,
                channel,
                { content: ResetGrinderRoles.MSG.GoodBye(member), allowedMentions: { users: [member.id], roles: [] } },
            )

            log.info(this.MSG.RemoveGrinderRoleFrom(member))
        }
    }

    static async getUsersWithLatestStreak(prisma: PrismaClient): Promise<User[]> {
        const users = await prisma.user.findMany({
            select: {
                discord_id: true,
                checkins: {
                    select: {
                        status: true,
                        created_at: true,
                    },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
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
