import type { BotRuntime } from '@core/runtime'
import type { PrismaClient } from '@generatedDB/client'
import { log } from '@core/logger'
import { registerCommands } from '@discord/commands'
import { registerEvents } from '@discord/events'
import { stopDiscordJobs } from '@discord/jobs'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

export function createDiscordBot(prisma: PrismaClient, token: string): BotRuntime {
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

    let stopped = false
    const doneState = Promise.withResolvers<void>()
    const done = doneState.promise

    client.on(Events.Invalidated, () => {
        log.error('Discord client session was invalidated.')
        doneState.reject(new Error('Discord client session was invalidated'))
    })

    const stop = async () => {
        if (stopped)
            return

        stopped = true

        await stopDiscordJobs()
        client.destroy()
        doneState.resolve()
    }

    const start = async () => {
        log.base('🚀 Starting Discord bot...')

        log.check('Loading events...')
        await registerEvents(client)
        log.success('Events loaded~')

        log.check('Loading commands...')
        await registerCommands(client)
        log.success('Commands loaded~')

        const ready = Promise.withResolvers<void>()
        client.once(Events.ClientReady, () => ready.resolve())
        client.once(Events.Error, err => ready.reject(err))

        client.on(Events.Error, (err) => {
            log.error(`Discord gateway error: ${err instanceof Error ? err.message : String(err)}`)
        })

        await client.login(token)
        await ready.promise

        log.base('🚀 Discord bot is running!')
    }

    return { start, stop, done }
}
