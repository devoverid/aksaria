import type { ICheckin } from '../types'

/**
 * Embed data structure for platform-agnostic message formatting
 */
export interface EmbedData {
    title: string
    description: string
    color?: string
    footer?: string
    fields?: EmbedField[]
}

export interface EmbedField {
    name: string
    value: string
    inline?: boolean
}

/**
 * Platform adapter interface
 * Implement this interface for each platform (Discord, Telegram, REST)
 */
export interface IPlatformAdapter {
    /**
     * Platform identifier
     */
    readonly platform: string

    /**
     * Send a plain text message to a user
     */
    sendMessage(userId: string, content: string): Promise<void>

    /**
     * Send a rich embed message to a user
     */
    sendEmbed(userId: string, embed: EmbedData): Promise<void>

    /**
     * Notify user that their checkin was approved
     */
    notifyCheckinApproved(userId: string, checkin: ICheckin, reviewerName: string): Promise<void>

    /**
     * Notify user that their checkin was rejected
     */
    notifyCheckinRejected(userId: string, checkin: ICheckin, reviewerName: string, reason?: string): Promise<void>

    /**
     * Notify user of successful checkin submission
     */
    notifyCheckinSubmitted(userId: string, checkin: ICheckin): Promise<void>

    /**
     * Get display name for a user
     */
    getUserDisplayName(userId: string): Promise<string>
}
