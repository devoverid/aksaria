import type { Client, TextChannel } from 'discord.js'
import process from 'node:process'
import { AUDIT_FLAME_CHANNEL, GRIND_ASHES_CHANNEL } from '@discord/config/discord'
import { registerClientReadyHandler } from '@discord/events/client-ready/registry'
import { EVENT_PATH } from '@discord/events/index'
import { getBot, getChannel } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { log } from '@core/logger'
import { scheduleDiscordJob } from '@discord/jobs'
import { ResetGrinderRoles } from '../validators/reset-grinder-roles'

export class ResetGrinderRolesError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ResetGrinderRolesError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerClientReadyHandler({
    desc: `Reset Grinder roles for users that didn't do a check-in yesterday or the check-in didn't approved.`,
    errorTag: () => `${moduleName}: ${ResetGrinderRoles.ERR.UnexpectedResetGrinderRoles}`,
    exec(client: Client) {
        try {
            scheduleDiscordJob('0 0 * * *', async () => {
                log.check(ResetGrinderRoles.MSG.JobRunning)

                const guild = await client.guilds.fetch(process.env.GUILD_ID!)
                const grindAshesChannel = await getChannel(guild, GRIND_ASHES_CHANNEL) as TextChannel
                ResetGrinderRoles.assertTextChannel(grindAshesChannel)
                const auditFlameChannel = await getChannel(guild, AUDIT_FLAME_CHANNEL) as TextChannel
                ResetGrinderRoles.assertTextChannel(auditFlameChannel)
                const bot = await getBot(guild)
                ResetGrinderRoles.assertMissPerms(bot, grindAshesChannel)
                ResetGrinderRoles.assertMissPerms(bot, auditFlameChannel)
                const users = await ResetGrinderRoles.getUsersWithLatestStreak(client.prisma)

                await ResetGrinderRoles.validateUsers(client.prisma, guild, grindAshesChannel, auditFlameChannel, users)

                log.success(ResetGrinderRoles.MSG.JobSuccess)
            })
        }
        catch (err) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
