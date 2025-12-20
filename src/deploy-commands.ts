import type { Command } from '@commands/command'
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js'
import path from 'node:path'
import process from 'node:process'
import { getModuleName, readFiles } from '@utils/io'
import { log } from '@utils/logger'
import { REST, Routes } from 'discord.js'

const root = path.join(__dirname, 'bot/commands')

async function loadCommands(): Promise<RESTPostAPIChatInputApplicationCommandsJSONBody[]> {
    const files = readFiles(root)

    log.base('🚀 Deploying commands...')

    const results: Array<RESTPostAPIChatInputApplicationCommandsJSONBody | null> = await Promise.all(
        files.map(async (file) => {
            const fileName = getModuleName(root, file)
            const { default: command } = await import(file) as { default: Command }
            if (!command)
                return null

            try {
                log.info(`Deploying command ${fileName}...`)
                if ('data' in command && 'execute' in command) {
                    return command.data.toJSON()
                }
                else {
                    log.error(`The command at ${file} is missing a required "data" or "execute" property.`)
                    return null
                }
            }
            catch (err) {
                log.error(`Failed to import command at ${file}: ${err}`)
                return null
            }
        }),
    )

    return results.filter(
        (c): c is RESTPostAPIChatInputApplicationCommandsJSONBody => c !== null,
    )
}

async function main() {
    const commands = await loadCommands()
    const rest = new REST().setToken(process.env.APP_TOKEN!)

    try {
        log.check(`Started refreshing ${commands.length} application (/) commands...`)

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.APP_ID!, process.env.GUILD_ID!),
            { body: commands },
        )

        log.success(`Successfully reloaded ${(data as unknown[]).length} application (/) commands~`)
        log.base('🚀 Commands deployed!')
    }
    catch (error) {
        log.error(`Error while deploying commands: ${error}`)
    }
}

main().catch((e) => {
    log.error(`Unhandled error: ${e}`)
})
