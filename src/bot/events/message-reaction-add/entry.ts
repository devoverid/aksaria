import type { Event } from '@events/event'
import type { MessageReaction, User } from 'discord.js'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { reactionHandlers } from './registry'

export default {
    name: Events.MessageReactionAdd,
    desc: 'Dispatch all registered MessageReactionAdd handlers.',
    async exec(client, reaction: MessageReaction, user: User) {
        for (const handler of reactionHandlers) {
            try {
                if (handler.match && !handler.match(reaction, user))
                    continue
                await handler.exec(client, reaction, user)
            }
            catch (err) {
                log.error(`Reaction handler failed ${handler.errorTag()}: ${err}`)
            }
        }
    },
} as Event
