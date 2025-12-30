import type { PrismaClient } from '@generatedDB/client'
import type { Checkin as CheckinType } from '@type/checkin'
import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE, GRINDER_ROLE } from '@config/discord'
import { createEmbed } from '@utils/component'
import { DiscordAssert, sendAsBot } from '@utils/discord'
import { DUMMY } from '@utils/placeholder'
import { NotifyWaitingCheckinMessage } from '../messages/notify-waiting-checkin'

export class NotifyWaitingCheckin extends NotifyWaitingCheckinMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]

    static async sendOpening(guildName: string, wardenDutyChannel: TextChannel) {
        const openingEmbed = createEmbed(
            `🔥 Maklumat Penjagaan Nyala`,
            this.MSG.Opening(guildName),
            DUMMY.COLOR,
            null,
            null,
            null,
            null,
            false,
        )
        await sendAsBot(null, wardenDutyChannel, {
            content: `<@&${FLAMEWARDEN_ROLE}>`,
            embeds: [openingEmbed],
            allowedMentions: { roles: [FLAMEWARDEN_ROLE, GRINDER_ROLE] },
        })
    }

    static async getTodayWaitingCheckins(prisma: PrismaClient): Promise<CheckinType[]> {
        const waitingCheckins = await prisma.checkin.findMany({
            where: {
                status: 'WAITING',
                reviewed_by: null,
                created_at: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
            include: {
                user: true,
            },
            orderBy: { created_at: 'asc' },
        }) as CheckinType[]

        return waitingCheckins
    }
}
