import type { Event } from '@events/event'
import type { GuildMember } from 'discord.js'
import { GRIND_ASHES_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { getChannel, sendAsBot } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { GrinderRole } from '../validators'

export class GrinderRoleError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('GrinderRoleError', message, options)
    }
}

export default {
    name: Events.GuildMemberUpdate,
    desc: 'Watches grinder role assignment/removal for members on guild member update.',
    async exec(_, oldMember: GuildMember, newMember: GuildMember) {
        try {
            if (!newMember.guild)
                throw new GrinderRoleError(GrinderRole.ERR.NotGuild)

            const newHasGrinderRole = GrinderRole.isMemberHasRole(newMember, GRINDER_ROLE)
            const oldHasGrinderRole = GrinderRole.isMemberHasRole(oldMember, GRINDER_ROLE)
            if (newHasGrinderRole && !oldHasGrinderRole) {
                const channel = await getChannel(newMember.guild, GRIND_ASHES_CHANNEL)
                GrinderRole.assertChannel(channel)

                await sendAsBot(
                    null,
                    channel,
                    { content: GrinderRole.MSG.Greetings(newMember), allowedMentions: { users: [newMember.id], roles: [] } },
                )
            }
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                log.error(`Failed to handle: ${GrinderRole.ERR.UnexpectedGrinderRole}: ${err}`)
        }
    },
} as Event
