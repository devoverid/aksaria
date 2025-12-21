import { GRIND_ASHES_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { registerGuildMemberUpdateHandler } from '@events/guild-member-update/registry'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { getChannel, sendAsBot } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { GrinderRole } from '../validators'

export class GrinderRoleError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('GrinderRoleError', message, options)
    }
}

export const WELCOME_NOTE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`
const moduleName = getModuleName(EVENT_PATH, __filename)

registerGuildMemberUpdateHandler({
    desc: 'Watches grinder role assignment/removal for members on guild member update.',
    errorTag: () => `${moduleName}: ${GrinderRole.ERR.UnexpectedGrinderRole}`,
    match: (_, newMember) => GrinderRole.isMemberHasRole(newMember, GRINDER_ROLE),
    async exec(_, oldMember, newMember) {
        try {
            if (!newMember.guild)
                throw new GrinderRoleError(GrinderRole.ERR.NotGuild)

            const newHasGrinderRole = GrinderRole.isMemberHasRole(newMember, GRINDER_ROLE)
            const oldHasGrinderRole = GrinderRole.isMemberHasRole(oldMember, GRINDER_ROLE)
            if (newHasGrinderRole && !oldHasGrinderRole) {
                const channel = await getChannel(newMember.guild, GRIND_ASHES_CHANNEL)
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
