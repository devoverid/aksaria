import type { Event } from '@events/event'
import type { Message } from 'discord.js'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { messageHandlers } from './registry'

export default {
    name: Events.MessageCreate,
    desc: 'Dispatch all registered MessageCreate handlers.',
    async exec(client, msg: Message) {
        for (const handler of messageHandlers) {
            try {
                if (handler.match && !handler.match(msg))
                    continue
                await handler.exec(client, msg)
            }
            catch (err) {
                log.error(`Message handler failed ${handler.errorTag()}: ${err}`)
            }
        }
    },
} as Event
