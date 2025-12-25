import type { GrindRole } from '../../config/discord'
import type { GuildMember, RoleManager } from 'discord.js'
import { getGrindRoles } from '../../config/discord'

export function getGrindRoleByStreakCount(roleManager: RoleManager, streak_count: number) {
    const role = getGrindRoles(roleManager).find(role => streak_count === role.threshold)
    return role
}

export async function attachNewGrindRole(member: GuildMember, grindRole: GrindRole) {
    await member.roles.remove(getGrindRoles().map(r => r.id))
    await member.roles.add(grindRole.id)
}
