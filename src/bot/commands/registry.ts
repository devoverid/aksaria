import type { Command } from '@commands/command'
import path from 'node:path'
import { readFiles } from '@utils/io'
import { log } from '@utils/logger'
import { Collection } from 'discord.js'
import { COMMAND_PATH } from '.'

export const commandRegistry = new Collection<string, Command>()

export function registerCommand(command: Command) {
    commandRegistry.set(command.data.name, command)
}

export async function loadCommands() {
    const files = readFiles(COMMAND_PATH).filter(file => !file.endsWith('/index.ts'))

    await Promise.all(
        files.map(async (file) => {
            const fileName = path.basename(file, path.extname(file))

            try {
                await import(file)
                log.info(`Loaded command file '${fileName}'`)
            }
            catch (err) {
                log.error(`Failed to load command file ${file}: ${err}`)
            }
        }),
    )
}
