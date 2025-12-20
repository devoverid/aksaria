import type { Command } from '@commands/command'
import type { Client } from 'discord.js'
import path from 'node:path'
import { getModuleName, readFiles } from '@utils/io'
import { log } from '@utils/logger'
import { Collection } from 'discord.js'

export class CommandError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = 'CommandError'
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export const COMMAND_PATH = path.basename(__dirname)
const files = readFiles(__dirname)

export async function registerCommands(client: Client) {
    client.commands = new Collection<string, Command>()

    for (const file of files) {
        const { default: command } = await import(file) as { default: Command }
        const fileName = getModuleName(COMMAND_PATH, file)

        try {
            if (command) {
                log.info(`Registering command ${fileName}...`)
                client.commands.set(command.data.name, command)
            }
        }
        catch (err: any) {
            const msg = err instanceof CommandError ? err.message : '❌ Something went wrong when importing the command'
            log.error(`Failed to register a command: ${msg}: ${err.message}`)
        }
    }
}
