/**
 * Platform-agnostic types for Aksaria
 */

// Platform types
export type Platform = 'discord' | 'telegram' | 'rest'
export type CheckinStatus = 'WAITING' | 'APPROVED' | 'REJECTED'

// Base entity interfaces
export interface IUser {
    id: number
    externalId: string
    platform: Platform
    createdAt: Date
    updatedAt?: Date | null
    checkinStreaks?: ICheckinStreak[]
    checkins?: ICheckin[]
}

export interface ICheckinStreak {
    id: number
    userId: number
    firstDate: Date
    lastDate?: Date | null
    streak: number
    updatedAt?: Date | null
    user?: IUser
    checkins?: ICheckin[]
}

export interface ICheckin {
    id: number
    publicId: string
    userId: number
    checkinStreakId: number
    description: string
    link?: string | null
    status: CheckinStatus
    reviewedBy?: string | null
    comment?: string | null
    createdAt: Date
    updatedAt?: Date | null
    user?: IUser
    checkinStreak?: ICheckinStreak
    attachments?: IAttachment[]
}

export interface IAttachment {
    id: number
    name: string
    url: string
    type: string
    size: number
    createdAt: Date
    moduleId: number
    moduleType: string
}

// Input types for creating entities
export interface CreateCheckinInput {
    userId: number
    description: string
}

export interface UpdateCheckinStatusInput {
    checkinId: number
    status: CheckinStatus
    reviewerId: string
    comment?: string | null
    isLateCheckin?: boolean
}

export interface AttachmentInput {
    name: string
    url: string
    type: string
    size: number
}

// Result types
export interface CheckinResult {
    checkin: ICheckin
    checkinStreak: ICheckinStreak
    prevCheckin?: ICheckin | null
    isNewStreak: boolean
}

export interface UserWithLatestCheckin extends IUser {
    latestCheckin?: ICheckin | null
    latestStreak?: ICheckinStreak | null
}
