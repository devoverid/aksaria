import type { Event } from '@discord/events/event'
import type { Client } from 'discord.js'
import { log } from '@core/logger'
import { Events } from 'discord.js'
import { clientReadyHandlers } from './registry'

export default {
    name: Events.ClientReady,
    once: true,
    desc: 'Runs all registered ClientReady handlers.',
    async exec(client: Client) {
        for (const handler of clientReadyHandlers) {
            try {
                await handler.exec(client)
            }
            catch (err) {
                log.error(`ClientReady handler failed ${handler.errorTag()}: ${err}`)
            }
        }
    },
} as Event
