import type { Client, TextChannel } from 'discord.js'
import process from 'node:process'
import { WARDEN_DUTY_CHANNEL } from '@discord/config/discord'
import { registerClientReadyHandler } from '@discord/events/client-ready/registry'
import { EVENT_PATH } from '@discord/events/index'
import { getBot, getChannel } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { log } from '@core/logger'
import { scheduleDiscordJob } from '@discord/jobs'
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
            scheduleDiscordJob('0 22 * * *', async () => {
                log.check(NotifyWaitingCheckin.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const wardenDutyChannel = await getChannel(guild, WARDEN_DUTY_CHANNEL) as TextChannel
                NotifyWaitingCheckin.assertTextChannel(wardenDutyChannel)
                const bot = await getBot(guild)
                NotifyWaitingCheckin.assertMissPerms(bot, wardenDutyChannel)
                const checkins = await NotifyWaitingCheckin.getTodayWaitingCheckins(client.prisma)

                if (checkins.length) {
                    await NotifyWaitingCheckin.sendOpening(guild.name, wardenDutyChannel)
                    await NotifyWaitingCheckin.sendList(checkins, wardenDutyChannel)
                    await NotifyWaitingCheckin.sendClosing(guild.name, wardenDutyChannel)

                    log.success(NotifyWaitingCheckin.MSG.JobSuccess)
                }
                else {
                    log.success(NotifyWaitingCheckin.MSG.NoWaitingCheckins)
                }
            })
        }
        catch (err) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
