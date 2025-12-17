import type { GuildMember } from 'discord.js'
import { DiscordAssert } from '@utils/discord'

export class ResetGrinderRolesMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedResetGrinderRoles: '❌ Something went wrong while resetting grinder roles',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        JobRunning: '[JOB] Running daily grinder reset',
        RemoveGrinderRoleFrom: (member: GuildMember) => `[JOB] Removed Grinder role from ${member.user.tag}`,
    }
}
