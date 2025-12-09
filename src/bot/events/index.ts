import type { Event } from '@events/event'
import type { Client } from 'discord.js'
import path from 'node:path'
import { getModuleName, readFiles } from '@utils/io'
import { log } from '@utils/logger'

export class EventError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = 'EventError'
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export const EVENT_PATH = path.basename(__dirname)
const files = readFiles(__dirname)

export async function registerEvents(client: Client) {
    for (const file of files) {
        const { default: event } = await import(file) as { default: Event }
        const fileName = getModuleName(EVENT_PATH, file)
        log.info(`Registering event ${fileName}...`)

        try {
            if (event.once) {
                client.once(event.name, (...args) => event.exec(client, ...args))
            }
            else {
                client.on(event.name, (...args) => {
                    event.exec(client, ...args)
                })
            }
        }
        catch (err: any) {
            const msg = err instanceof EventError ? err.message : '❌ Something went wrong when importing the event'
            log.error(`Failed to register an event: ${msg}: ${err.message}`)
        }
    }
}
