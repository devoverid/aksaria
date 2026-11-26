import type { RoleManager } from 'discord.js'
import { STREAK_MILESTONES } from '@core/checkin/policy'

export const SYSTEM_ASHES_CHANNEL = '1405871418788548638'
export const CHECKIN_CHANNEL = '1405165987288059944'
export const AURA_FARMING_CHANNEL = '1405162471496351794'
export const GRIND_ASHES_CHANNEL = '1405165926600409148'
export const WARDEN_DUTY_CHANNEL = '1404086708051509318'
export const AUDIT_FLAME_CHANNEL = '1447816805329539162'
export const IGNITE_PATH_CHANNEL = '1405159743596793997'
export const BEARER_LOUNGE_CHANNEL = '1404087168552403044'

export interface GrindRole {
    name?: string
    id: string
    threshold: number
}

export const ARCHFYRE_ROLE = '1402625885684891658'
export const FLAMEWARDEN_ROLE = '1403022712938561668'
export const GRINDER_ROLE = '1403320523756146768'

const GRIND_ROLES: GrindRole[] = [
    {
        id: '1403320928519327755',
        threshold: STREAK_MILESTONES[0],
    },
    {
        id: '1403320958202282047',
        threshold: STREAK_MILESTONES[1],
    },
    {
        id: '1403321016406638674',
        threshold: STREAK_MILESTONES[2],
    },
    {
        id: '1403322168841994340',
        threshold: STREAK_MILESTONES[3],
    },
    {
        id: '1403321040448258138',
        threshold: STREAK_MILESTONES[4],
    },
    {
        id: '1403321099688607774',
        threshold: STREAK_MILESTONES[5],
    },
    {
        id: '1403321123331899402',
        threshold: STREAK_MILESTONES[6],
    },
]

export function getGrindRoles(roleManager?: RoleManager) {
    if (!GRIND_ROLES[0].name && roleManager) {
        GRIND_ROLES.forEach((r) => {
            const role = roleManager.cache.find(role => role.id === r.id)
            if (role) {
                r.name = role.name
            }
        })
    }

    return GRIND_ROLES
}
