import type { Client } from 'discord.js'
import process from 'node:process'
import { GRIND_ASHES_CHANNEL } from '@config/discord'
import { registerClientReadyHandler } from '@events/client-ready/registry'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { getChannel } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import cron from 'node-cron'
import { ResetGrinderRoles } from '../validators/reset-grinder-roles'

export class ResetGrinderRolesError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ResetGrinderRolesError', message, options)
    }
}

export const RESET_GRINDER_ROLE_ID = generateCustomId(EVENT_PATH, __filename)

registerClientReadyHandler({
    id: RESET_GRINDER_ROLE_ID,
    desc: `Reset Grinder roles for users that didn't do a check-in yesterday or the check-in didn't approved.`,
    errorTag: () => `${RESET_GRINDER_ROLE_ID}: ${ResetGrinderRoles.ERR.UnexpectedResetGrinderRoles}`,
    exec(client: Client) {
        try {
            cron.schedule('0 0 * * *', async () => {
                log.check(ResetGrinderRoles.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const channel = await getChannel(guild, GRIND_ASHES_CHANNEL)
                ResetGrinderRoles.assertChannel(channel)
                const users = await ResetGrinderRoles.getUsersWithLatestStreak(client.prisma)

                await ResetGrinderRoles.validateUsers(client.prisma, guild, channel, users)

                log.success(ResetGrinderRoles.MSG.JobSuccess)
            })
        }
        catch (err) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
