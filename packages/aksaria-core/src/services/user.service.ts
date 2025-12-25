import type { PrismaClient } from '../db/client'
import type { IUser, Platform, UserWithLatestCheckin } from '../types'

/**
 * User service - handles user-related operations
 */
export class UserService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Find a user by their external ID and platform
     */
    async findByExternalId(externalId: string, platform: Platform = 'discord'): Promise<IUser | null> {
        const user = await this.prisma.user.findFirst({
            where: {
                // Note: In the current schema, external_id is still discord_id
                // This will be updated after migration
                discord_id: externalId,
            },
        })

        if (!user) return null

        return this.mapToIUser(user, platform)
    }

    /**
     * Find or create a user
     */
    async findOrCreate(externalId: string, platform: Platform = 'discord'): Promise<IUser> {
        const user = await this.prisma.user.upsert({
            where: { discord_id: externalId },
            create: { discord_id: externalId },
            update: {},
        })

        return this.mapToIUser(user, platform)
    }

    /**
     * Find a user with their latest checkin and streak info
     */
    async findWithLatestCheckin(externalId: string, platform: Platform = 'discord'): Promise<UserWithLatestCheckin | null> {
        const user = await this.prisma.user.findFirst({
            where: { discord_id: externalId },
            include: {
                checkin_streaks: {
                    orderBy: { first_date: 'desc' },
                    take: 1,
                    include: {
                        checkins: {
                            orderBy: { created_at: 'desc' },
                            take: 1,
                        },
                    },
                },
                checkins: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    include: {
                        checkin_streak: true,
                    },
                },
            },
        })

        if (!user) return null

        const latestStreak = user.checkin_streaks[0]
        const latestCheckin = user.checkins[0]

        return {
            id: user.id,
            externalId: user.discord_id,
            platform,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            latestCheckin: latestCheckin ? {
                id: latestCheckin.id,
                publicId: latestCheckin.public_id,
                userId: latestCheckin.user_id,
                checkinStreakId: latestCheckin.checkin_streak_id,
                description: latestCheckin.description,
                link: latestCheckin.link,
                status: latestCheckin.status as 'WAITING' | 'APPROVED' | 'REJECTED',
                reviewedBy: latestCheckin.reviewed_by,
                comment: latestCheckin.comment,
                createdAt: latestCheckin.created_at,
                updatedAt: latestCheckin.updated_at,
                checkinStreak: latestCheckin.checkin_streak ? {
                    id: latestCheckin.checkin_streak.id,
                    userId: latestCheckin.checkin_streak.user_id,
                    firstDate: latestCheckin.checkin_streak.first_date,
                    lastDate: latestCheckin.checkin_streak.last_date,
                    streak: latestCheckin.checkin_streak.streak,
                    updatedAt: latestCheckin.checkin_streak.updated_at,
                } : undefined,
            } : null,
            latestStreak: latestStreak ? {
                id: latestStreak.id,
                userId: latestStreak.user_id,
                firstDate: latestStreak.first_date,
                lastDate: latestStreak.last_date,
                streak: latestStreak.streak,
                updatedAt: latestStreak.updated_at,
            } : null,
        }
    }

    /**
     * Map database user to IUser interface
     */
    private mapToIUser(user: any, platform: Platform): IUser {
        return {
            id: user.id,
            externalId: user.discord_id,
            platform,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        }
    }
}
