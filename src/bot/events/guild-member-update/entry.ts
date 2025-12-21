import type { Event } from '@events/event'
import type { GuildMember } from 'discord.js'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { guildMemberUpdateHandlers } from './registry'

export default {
    name: Events.GuildMemberUpdate,
    desc: 'Dispatch all registered GuildMemberUpdate handlers.',
    async exec(client, oldMember: GuildMember, newMember: GuildMember) {
        for (const handler of guildMemberUpdateHandlers) {
            try {
                if (handler.match && !handler.match(oldMember, newMember))
                    continue
                await handler.exec(client, oldMember, newMember)
            }
            catch (err) {
                log.error(`GuildMemberUpdate handler failed ${handler.errorTag()}: ${err}`)
            }
        }
    },
} as Event
