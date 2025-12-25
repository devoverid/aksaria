import process from 'node:process'
import { commandRegistry, loadCommands } from '@commands/registry'
import { log } from '@utils/logger'
import { REST, Routes } from 'discord.js'

async function main() {
    log.base('🚀 Deploying commands...')

    try {
        await loadCommands()
        const commands = [...commandRegistry.values()].map(cmd => cmd.data.toJSON())
        const rest = new REST().setToken(process.env.APP_TOKEN!)

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
