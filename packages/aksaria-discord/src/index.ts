import process from 'node:process'
import { PrismaClient } from '@generatedDB/client'
import { registerCommands } from './bot/commands'
import { registerEvents } from './bot/events'
import { log } from '@utils/logger'
import { DiscordAdapter } from './adapters/discord-adapter'
import { Client, GatewayIntentBits, Partials } from 'discord.js'

// Create Prisma client singleton
const prisma = new PrismaClient()

async function main() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
        ],
        partials: [
            Partials.Message,
            Partials.Reaction,
            Partials.Channel,
        ],
    })
    
    // Attach Prisma client
    client.prisma = prisma

    // Create Discord adapter for notifications
    const discordAdapter = new DiscordAdapter(client)

    log.base('🚀 Starting bot...')

    log.check('Loading events...')
    await registerEvents(client)
    log.success('Events loaded~')

    log.check('Loading commands...')
    await registerCommands(client)
    log.success('Commands loaded~')

    await client.login(process.env.APP_TOKEN)

    log.base('🚀 Bot is running!')
}

main().catch((err) => {
    log.error('❌ Failed to start bot:')
    console.error(err)
})
