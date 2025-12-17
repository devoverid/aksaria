import type { Event } from '@events/event'
import type { Client } from 'discord.js'
import process from 'node:process'
import { GRINDER_ROLE } from '@config/discord'
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
                log.info(ResetGrinderRoles.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const users = await ResetGrinderRoles.getUsersWithLatestCheckin(client.prisma)

                for (const user of users) {
                    const lastCheckin = user.checkins?.[0]
                    if (ResetGrinderRoles.hasValidCheckin(lastCheckin))
                        continue

                    try {
                        const member = await guild.members.fetch(user.discord_id)
                        await member.roles.remove(GRINDER_ROLE)
                        log.info(ResetGrinderRoles.MSG.RemoveGrinderRoleFrom(member))
                    }
                    catch (err) {
                        log.warn(`${ResetGrinderRoles.ERR.NoMember}: ${err}`)
                    }
                }
            })
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                log.error(`Failed to handle ${ResetGrinderRoles.ERR.UnexpectedResetGrinderRoles}: ${err}`)
        }
    },
} as Event
