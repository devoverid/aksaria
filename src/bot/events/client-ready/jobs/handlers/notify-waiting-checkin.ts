import type { Client, TextChannel } from 'discord.js'
import process from 'node:process'
import { WARDEN_DUTY_CHANNEL } from '@config/discord'
import { registerClientReadyHandler } from '@events/client-ready/registry'
import { EVENT_PATH } from '@events/index'
import { getChannel } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { log } from '@utils/logger'
import cron from 'node-cron'
import { NotifyWaitingCheckin } from '../validators/notify-waiting-checkin'

export class NotifyWaitingCheckinError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('NotifyWaitingCheckinError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerClientReadyHandler({
    desc: 'Notifies Flamewardens if there are users with check-in status still waiting for review at 22:00 (WIB).',
    errorTag: () => `${moduleName}: ${NotifyWaitingCheckin.ERR.UnexpectedNotifyWaitingCheckin}`,
    async exec(client: Client) {
        try {
            cron.schedule('0 22 * * *', async () => {
                log.check(NotifyWaitingCheckin.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const wardenDutyChannel = await getChannel(guild, WARDEN_DUTY_CHANNEL) as TextChannel
                NotifyWaitingCheckin.assertChannel(wardenDutyChannel)
                const checkins = await NotifyWaitingCheckin.getTodayWaitingCheckins(client.prisma)

                await NotifyWaitingCheckin.sendOpening(guild.name, wardenDutyChannel)
                await NotifyWaitingCheckin.sendList(checkins, wardenDutyChannel)

                log.success(NotifyWaitingCheckin.MSG.JobSuccess)
            })
        }
        catch (err) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
