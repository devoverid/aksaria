import type { TextChannel } from 'discord.js'
import { AURA_FARMING_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { registerGuildMemberUpdateHandler } from '@events/guild-member-update/registry'
import { EVENT_PATH } from '@events/index'
import { getChannelOrThread, sendAsBot } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { GrinderRole } from '../validators'

export class GrinderRoleError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('GrinderRoleError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerGuildMemberUpdateHandler({
    desc: 'Watches grinder role assignment/removal for members on guild member update.',
    errorTag: () => `${moduleName}: ${GrinderRole.ERR.UnexpectedGrinderRole}`,
    async exec(_, oldMember, newMember) {
        try {
            if (!newMember.guild)
                throw new GrinderRoleError(GrinderRole.ERR.NotGuild)

            const newHasGrinderRole = GrinderRole.isMemberHasRole(newMember, GRINDER_ROLE)
            const oldHasGrinderRole = GrinderRole.isMemberHasRole(oldMember, GRINDER_ROLE)
            if (newHasGrinderRole && !oldHasGrinderRole) {
                const channel = await getChannelOrThread(newMember.guild, AURA_FARMING_CHANNEL) as TextChannel
                GrinderRole.assertChannel(channel)
                const button = GrinderRole.generateButton(newMember.guild.id)

                await sendAsBot(
                    null,
                    channel,
                    { content: GrinderRole.MSG.Greetings(newMember), components: [button], allowedMentions: { users: [newMember.id], roles: [] } },
                )
            }
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
