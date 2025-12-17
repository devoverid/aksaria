import type { PrismaClient } from '@generatedDB/client'
import { isDateToday, isDateYesterday } from '@utils/date'
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
