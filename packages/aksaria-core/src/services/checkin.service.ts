import crypto from 'node:crypto'
import type { Prisma, PrismaClient } from '../db/client'
import type {
    CheckinResult,
    CheckinStatus,
    ICheckin,
    ICheckinStreak,
    UpdateCheckinStatusInput,
} from '../types'
import { isDateToday, isStreakContinuing } from '../utils/date'

const PUBLIC_ID_PREFIX = 'CHK-'

/**
 * Checkin service - handles checkin and streak business logic
 */
export class CheckinService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Create a new checkin for a user
     * Handles streak logic automatically
     */
    async createCheckin(userId: number, description: string): Promise<CheckinResult> {
        // Get the user's latest streak
        const latestStreak = await this.prisma.checkinStreak.findFirst({
            where: { user_id: userId },
            orderBy: { first_date: 'desc' },
            include: {
                checkins: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        })

        const decision = this.determineStreakDecision(latestStreak)

        return this.prisma.$transaction(async (tx) => {
            const checkinStreak = await this.upsertStreak(tx, userId, latestStreak, decision)
            const checkin = await this.createCheckinRecord(tx, userId, checkinStreak.id, description)
            const prevCheckin = decision === 'next'
                ? await this.getPreviousCheckin(tx, userId, checkinStreak.id, checkin.id)
                : null

            return {
                checkin: this.mapToICheckin(checkin),
                checkinStreak: this.mapToICheckinStreak(checkinStreak),
                prevCheckin: prevCheckin ? this.mapToICheckin(prevCheckin) : null,
                isNewStreak: decision === 'new',
            }
        })
    }

    /**
     * Get a checkin by its ID
     */
    async getCheckinById(id: number): Promise<ICheckin | null> {
        const checkin = await this.prisma.checkin.findUnique({
            where: { id },
            include: { user: true, checkin_streak: true },
        })

        return checkin ? this.mapToICheckin(checkin) : null
    }

    /**
     * Get a checkin by its public ID
     */
    async getCheckinByPublicId(publicId: string): Promise<ICheckin | null> {
        const checkin = await this.prisma.checkin.findUnique({
            where: { public_id: publicId },
            include: { user: true, checkin_streak: true },
        })

        return checkin ? this.mapToICheckin(checkin) : null
    }

    /**
     * Get a waiting checkin by ID
     */
    async getWaitingCheckin(checkinId: number): Promise<ICheckin | null> {
        const checkin = await this.prisma.checkin.findFirst({
            where: {
                id: checkinId,
                status: 'WAITING',
                reviewed_by: null,
            },
            include: { user: true, checkin_streak: true },
        })

        return checkin ? this.mapToICheckin(checkin) : null
    }

    /**
     * Get a waiting checkin for a user
     */
    async getWaitingCheckinForUser(userId: number): Promise<ICheckin | null> {
        const checkin = await this.prisma.checkin.findFirst({
            where: {
                user_id: userId,
                status: 'WAITING',
                reviewed_by: null,
            },
            include: { user: true, checkin_streak: true },
        })

        return checkin ? this.mapToICheckin(checkin) : null
    }

    /**
     * Update checkin status (approve/reject)
     */
    async updateCheckinStatus(input: UpdateCheckinStatusInput): Promise<ICheckin> {
        const { checkinId, status, reviewerId, comment, isLateCheckin } = input

        const checkin = await this.prisma.checkin.findUnique({
            where: { id: checkinId },
        })

        if (!checkin) {
            throw new Error('Checkin not found')
        }

        const updatedDate = isLateCheckin ? checkin.created_at : new Date()

        const updatedCheckin = await this.prisma.checkin.update({
            where: { id: checkinId },
            data: {
                status,
                reviewed_by: reviewerId,
                comment,
                updated_at: updatedDate,
                checkin_streak: {
                    update: {
                        streak: {
                            increment: status === 'APPROVED' ? 1 : 0,
                        },
                        last_date: updatedDate,
                        updated_at: updatedDate,
                    },
                },
            },
            include: { checkin_streak: true, user: true },
        })

        return this.mapToICheckin(updatedCheckin)
    }

    /**
     * Update checkin message link
     */
    async updateCheckinLink(checkinId: number, link: string): Promise<ICheckin> {
        const updatedCheckin = await this.prisma.checkin.update({
            where: { id: checkinId },
            data: { link },
            include: { checkin_streak: true },
        })

        return this.mapToICheckin(updatedCheckin)
    }

    /**
     * Check if a user has already checked in today
     */
    hasCheckedInToday(streak: ICheckinStreak | undefined | null, checkin: ICheckin | undefined | null): boolean {
        const streakWasToday = streak?.lastDate ? isDateToday(streak.lastDate) : false
        const checkinWasToday = checkin?.createdAt ? isDateToday(checkin.createdAt) : false

        return streakWasToday || checkinWasToday
    }

    /**
     * Check if a checkin is not rejected
     */
    isNotRejectedCheckin(checkin: ICheckin | undefined | null): boolean {
        return !!checkin?.status && checkin.status !== 'REJECTED'
    }

    /**
     * Determine if streak should continue or start new
     */
    determineStreakDecision(lastStreak: any): 'new' | 'next' {
        if (!lastStreak) return 'new'
        if (!lastStreak.last_date) return 'new'

        const lastCheckin = lastStreak.checkins?.[0]
        if (lastCheckin?.status === 'WAITING') return 'new'

        return isStreakContinuing(lastStreak.last_date) ? 'next' : 'new'
    }

    /**
     * Generate a unique public ID for a checkin
     */
    async generatePublicId(tx: Prisma.TransactionClient = this.prisma as any): Promise<string> {
        while (true) {
            const random = crypto.randomBytes(3).toString('hex').toUpperCase()
            const id = `${PUBLIC_ID_PREFIX}${random}`
            const exists = await tx.checkin.findUnique({ where: { public_id: id } })

            if (!exists) return id
        }
    }

    // Private helpers

    private async upsertStreak(
        tx: Prisma.TransactionClient,
        userId: number,
        lastStreak: any,
        decision: 'new' | 'next',
    ): Promise<any> {
        if (decision === 'new') {
            return tx.checkinStreak.create({
                data: { user_id: userId },
            })
        }

        return tx.checkinStreak.update({
            where: { id: lastStreak!.id },
            data: { last_date: new Date() },
        })
    }

    private async createCheckinRecord(
        tx: Prisma.TransactionClient,
        userId: number,
        checkinStreakId: number,
        description: string,
    ): Promise<any> {
        return tx.checkin.create({
            data: {
                public_id: await this.generatePublicId(tx),
                user_id: userId,
                checkin_streak_id: checkinStreakId,
                description,
                status: 'WAITING',
            },
        })
    }

    private async getPreviousCheckin(
        tx: Prisma.TransactionClient,
        userId: number,
        streakId: number,
        currentCheckinId: number,
    ): Promise<any> {
        return tx.checkin.findFirst({
            where: {
                user_id: userId,
                checkin_streak_id: streakId,
                id: { not: currentCheckinId },
            },
            orderBy: { created_at: 'desc' },
        })
    }

    private mapToICheckin(checkin: any): ICheckin {
        return {
            id: checkin.id,
            publicId: checkin.public_id,
            userId: checkin.user_id,
            checkinStreakId: checkin.checkin_streak_id,
            description: checkin.description,
            link: checkin.link,
            status: checkin.status as CheckinStatus,
            reviewedBy: checkin.reviewed_by,
            comment: checkin.comment,
            createdAt: checkin.created_at,
            updatedAt: checkin.updated_at,
            user: checkin.user ? {
                id: checkin.user.id,
                externalId: checkin.user.discord_id,
                platform: 'discord',
                createdAt: checkin.user.created_at,
                updatedAt: checkin.user.updated_at,
            } : undefined,
            checkinStreak: checkin.checkin_streak ? this.mapToICheckinStreak(checkin.checkin_streak) : undefined,
        }
    }

    private mapToICheckinStreak(streak: any): ICheckinStreak {
        return {
            id: streak.id,
            userId: streak.user_id,
            firstDate: streak.first_date,
            lastDate: streak.last_date,
            streak: streak.streak,
            updatedAt: streak.updated_at,
        }
    }
}
