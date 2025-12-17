import type { PrismaClient } from '@generatedDB/client'
import type { Guild, GuildMember } from 'discord.js'
import { getGrindRoles, GRINDER_ROLE } from '@config/discord'
import { isDateToday, isDateYesterday } from '@utils/date'
import { log } from '@utils/logger'
import { ResetGrinderRolesMessage } from '../messages/reset-grinder-roles'

interface UserWithLatestCheckin {
    discord_id: string
    checkins: {
        status: string
        created_at: Date
    }[]
}

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

    static async validateUsers(guild: Guild, users: UserWithLatestCheckin[]) {
        for (const user of users) {
            const lastCheckin = user.checkins?.[0]
            if (this.hasValidCheckin(lastCheckin))
                continue

            const member = await guild.members.fetch(user.discord_id)
            await this.removeGrinderRoles(member)

            log.info(this.MSG.RemoveGrinderRoleFrom(member))
        }
    }

    static async getUsersWithLatestCheckin(prisma: PrismaClient): Promise<UserWithLatestCheckin[]> {
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
            },
        }) as UserWithLatestCheckin[]

        return users
    }
}
