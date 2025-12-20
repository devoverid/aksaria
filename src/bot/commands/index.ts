import type { Client } from 'discord.js'
import path from 'node:path'
import { readFiles } from '@utils/io'
import { log } from '@utils/logger'
import { commandRegistry } from './registry'

export class CommandError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = 'CommandError'
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export const COMMAND_PATH = path.basename(__dirname)

export async function loadCommands(client: Client) {
    const root = path.join(__dirname)
    const files = readFiles(root)

    await Promise.all(
        files.map(async (file) => {
            try {
                await import(file)
                log.info(`Loaded command file ${file}`)
            }
            catch (err) {
                log.error(`Failed to load command file ${file}: ${err}`)
            }
        }),
    )

    client.commands = commandRegistry
}
