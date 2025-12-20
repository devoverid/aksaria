import type { Client } from 'discord.js'
import path from 'node:path'
import { commandRegistry, loadCommands } from './registry'

export class CommandError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = 'CommandError'
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export const COMMAND_PATH = path.join(__dirname)

export async function registerCommands(client: Client) {
    await loadCommands()

    client.commands = commandRegistry
}
