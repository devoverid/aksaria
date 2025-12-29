import type { GrindRole } from '@config/discord'
import type { GuildMember, RoleManager } from 'discord.js'
import { getGrindRoles } from '@config/discord'

export function getGrindRoleByStreakCount(roles: RoleManager, streakCount: number) {
    let mactchedRole: GrindRole | undefined

    for (const role of getGrindRoles(roles)) {
        if (streakCount >= role.threshold) {
            mactchedRole = role
        }
        else {
            break
        }
    }

    return mactchedRole
}

export async function attachNewGrindRole(member: GuildMember, grindRole: GrindRole) {
    await member.roles.remove(getGrindRoles().map(r => r.id))
    await member.roles.add(grindRole.id)
}
