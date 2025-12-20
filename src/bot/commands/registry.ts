import type { Command } from '@commands/command'
import { Collection } from 'discord.js'

export const commandRegistry = new Collection<string, Command>()

export function registerCommand(command: Command) {
    commandRegistry.set(command.data.name, command)
}
