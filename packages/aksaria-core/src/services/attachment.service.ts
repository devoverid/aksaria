import type { PrismaClient } from '../db/client'
import type { AttachmentInput, IAttachment } from '../types'

/**
 * Attachment service - handles attachment-related operations
 */
export class AttachmentService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Create attachments for a checkin
     */
    async createAttachments(checkinId: number, attachments: AttachmentInput[]): Promise<IAttachment[]> {
        if (attachments.length === 0) return []

        await this.prisma.attachment.createMany({
            data: attachments.map(a => ({
                name: a.name,
                url: a.url,
                type: a.type,
                size: a.size,
                module_id: checkinId,
                module_type: 'CHECKIN',
            })),
        })

        return this.getAttachmentsByCheckin(checkinId)
    }

    /**
     * Get all attachments for a checkin
     */
    async getAttachmentsByCheckin(checkinId: number): Promise<IAttachment[]> {
        const attachments = await this.prisma.attachment.findMany({
            where: {
                module_id: checkinId,
                module_type: 'CHECKIN',
            },
            orderBy: { created_at: 'asc' },
        })

        return attachments.map(this.mapToIAttachment)
    }

    /**
     * Delete all attachments for a checkin
     */
    async deleteAttachmentsByCheckin(checkinId: number): Promise<void> {
        await this.prisma.attachment.deleteMany({
            where: {
                module_id: checkinId,
                module_type: 'CHECKIN',
            },
        })
    }

    private mapToIAttachment(attachment: any): IAttachment {
        return {
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size,
            createdAt: attachment.created_at,
            moduleId: attachment.module_id,
            moduleType: attachment.module_type,
        }
    }
}
