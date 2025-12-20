import process from 'node:process'
import { loadCommands } from '@commands/index'
import { prisma } from '@db/client'
import { loadEvents } from '@events/index'
import { log } from '@utils/logger'
import { Client, GatewayIntentBits, Partials } from 'discord.js'

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
    client.prisma = prisma

    log.base('🚀 Starting bot...')

    log.check('Loading events...')
    await loadEvents(client)
    log.success('Events loaded~')

    log.check('Loading commands...')
    await loadCommands(client)
    log.success('Commands loaded~')

    await client.login(process.env.APP_TOKEN)

    log.base('🚀 Bot is running!')
}

main().catch((err) => {
    log.error('❌ Failed to start bot:')
    console.error(err)
})
