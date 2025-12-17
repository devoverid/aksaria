import type { Event } from '@events/event'
import type { Client } from 'discord.js'
import process from 'node:process'
import { GRIND_ASHES_CHANNEL } from '@config/discord'
import { getChannel } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import cron from 'node-cron'
import { ResetGrinderRoles } from '../validators/reset-grinder-roles'

export class ResetGrinderRolesError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ResetGrinderRolesError', message, options)
    }
}

export default {
    name: Events.ClientReady,
    desc: `Reset Grinder roles for users that didn't do a check-in yesterday or the check-in didn't approved.`,
    once: true,
    exec(client: Client) {
        try {
            cron.schedule('0 0 * * *', async () => {
                log.check(ResetGrinderRoles.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const channel = await getChannel(guild, GRIND_ASHES_CHANNEL)
                ResetGrinderRoles.assertChannel(channel)
                const users = await ResetGrinderRoles.getUsersWithLatestCheckin(client.prisma)

                await ResetGrinderRoles.validateUsers(guild, channel, users)

                log.success(ResetGrinderRoles.MSG.JobSuccess)
            })
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                log.error(`Failed to handle ${ResetGrinderRoles.ERR.UnexpectedResetGrinderRoles}: ${err}`)
        }
    },
} as Event
