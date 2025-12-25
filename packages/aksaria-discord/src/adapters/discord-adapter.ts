import type { Client, EmbedBuilder } from 'discord.js'
import { createEmbed } from '@utils/component'

// Types for platform adapter
export interface EmbedData {
    title: string
    description: string
    color?: string
    footer?: string
}

export interface ICheckin {
    id: number
    publicId: string
    userId: number
    checkinStreakId: number
    description: string
    link?: string | null
    status: 'WAITING' | 'APPROVED' | 'REJECTED'
    reviewedBy?: string | null
    comment?: string | null
    createdAt: Date
    updatedAt?: Date | null
    checkinStreak?: {
        id: number
        userId: number
        firstDate: Date
        lastDate?: Date | null
        streak: number
        updatedAt?: Date | null
    }
}

export interface IPlatformAdapter {
    readonly platform: string
    sendMessage(userId: string, content: string): Promise<void>
    sendEmbed(userId: string, embed: EmbedData): Promise<void>
    notifyCheckinApproved(userId: string, checkin: ICheckin, reviewerName: string): Promise<void>
    notifyCheckinRejected(userId: string, checkin: ICheckin, reviewerName: string, reason?: string): Promise<void>
    notifyCheckinSubmitted(userId: string, checkin: ICheckin): Promise<void>
    getUserDisplayName(userId: string): Promise<string>
}

/**
 * Discord implementation of IPlatformAdapter
 */
export class DiscordAdapter implements IPlatformAdapter {
    readonly platform = 'discord'

    constructor(private client: Client) {}

    async sendMessage(userId: string, content: string): Promise<void> {
        const user = await this.client.users.fetch(userId)
        await user.send(content)
    }

    async sendEmbed(userId: string, embed: EmbedData): Promise<void> {
        const user = await this.client.users.fetch(userId)
        const discordEmbed = createEmbed(
            embed.title,
            embed.description,
            embed.color ?? '#5865F2',
            embed.footer ? { text: embed.footer } : undefined,
        )
        await user.send({ embeds: [discordEmbed] })
    }

    async notifyCheckinApproved(userId: string, checkin: ICheckin, reviewerName: string): Promise<void> {
        const user = await this.client.users.fetch(userId)
        const embed = createEmbed(
            '🔥 *Check-In* Disetujui',
            `Check-in **#${checkin.publicId}** Anda telah disetujui oleh **${reviewerName}**!\n\n` +
            `🔥 **Current Streak:** ${checkin.checkinStreak?.streak ?? 0} day(s)\n` +
            `📝 **Deskripsi:** ${checkin.description}`,
            '#4CAF50',
            { text: '✨ Aksaria Daily Check-In' },
        )
        await user.send({ embeds: [embed] })
    }

    async notifyCheckinRejected(userId: string, checkin: ICheckin, reviewerName: string, reason?: string): Promise<void> {
        const user = await this.client.users.fetch(userId)
        const embed = createEmbed(
            '⚠️ *Check-In* Ditolak',
            `Check-in **#${checkin.publicId}** Anda ditolak oleh **${reviewerName}**.\n\n` +
            (reason ? `📋 **Alasan:** ${reason}\n\n` : '') +
            `📝 **Deskripsi:** ${checkin.description}\n\n` +
            `Silakan perbaiki dan coba lagi.`,
            '#D9534F',
            { text: '✨ Aksaria Daily Check-In' },
        )
        await user.send({ embeds: [embed] })
    }

    async notifyCheckinSubmitted(userId: string, checkin: ICheckin): Promise<void> {
        const user = await this.client.users.fetch(userId)
        const embed = createEmbed(
            '🎉 *Check-In* Berhasil',
            `Check-in **#${checkin.publicId}** telah berhasil dikirim!\n\n` +
            `📝 **Deskripsi:** ${checkin.description}\n\n` +
            `⏳ Menunggu review dari Flamewarden...`,
            '#5865F2',
            { text: '✨ Aksaria Daily Check-In' },
        )
        await user.send({ embeds: [embed] })
    }

    async getUserDisplayName(userId: string): Promise<string> {
        const user = await this.client.users.fetch(userId)
        return user.displayName ?? user.username
    }
}
