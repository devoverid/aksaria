import type { Client, GuildMember } from 'discord.js'

export interface GuildMemberUpdateHandler {
    desc: string
    errorTag: () => string
    match?: (oldMember: GuildMember, newMember: GuildMember) => boolean
    exec: (client: Client, oldMember: GuildMember, newMember: GuildMember) => Promise<void> | void
}

export const guildMemberUpdateHandlers: GuildMemberUpdateHandler[] = []

export function registerGuildMemberUpdateHandler(handler: GuildMemberUpdateHandler) {
    guildMemberUpdateHandlers.push(handler)
}
