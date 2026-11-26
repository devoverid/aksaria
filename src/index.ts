import type { PrismaClient } from '@generatedDB/client'
import type { BotRuntime } from '@core/runtime'
import process from 'node:process'
import { log } from '@core/logger'

type Platform = 'discord' | 'telegram'

function parsePlatforms(raw: string | undefined): Platform[] {
    const value = (raw ?? '').trim()

    if (!value || value === 'discord')
        return ['discord']
    if (value === 'telegram')
        return ['telegram']
    if (value === 'both')
        return ['discord', 'telegram']

    throw new Error('Invalid BOT_PLATFORMS value; expected discord, telegram or both')
}

let prisma: PrismaClient | undefined
const runtimes: BotRuntime[] = []
let shuttingDown = false
let failed = false

async function shutdown(code: number): Promise<void> {
    if (shuttingDown)
        return

    shuttingDown = true

    await Promise.allSettled(runtimes.map(runtime => runtime.stop()))
    await prisma?.$disconnect().catch(() => {})
    process.exit(code)
}

async function main(): Promise<void> {
    const platforms = parsePlatforms(process.env.BOT_PLATFORMS)

    if (platforms.includes('discord') && !process.env.APP_TOKEN?.trim())
        throw new Error('APP_TOKEN is required when BOT_PLATFORMS enables Discord')
    if (platforms.includes('telegram') && !process.env.TELEGRAM_BOT_TOKEN?.trim())
        throw new Error('TELEGRAM_BOT_TOKEN is required when BOT_PLATFORMS enables Telegram')

    const [{ prisma: client }, discordModule, telegramModule] = await Promise.all([
        import('@core/db/client'),
        platforms.includes('discord') ? import('@discord/index') : null,
        platforms.includes('telegram') ? import('@telegram/index') : null,
    ])
    prisma = client

    if (discordModule)
        runtimes.push(discordModule.createDiscordBot(prisma, process.env.APP_TOKEN!))
    if (telegramModule)
        runtimes.push(telegramModule.createTelegramBot(prisma, process.env))

    for (const runtime of runtimes) {
        void runtime.done.catch((err) => {
            failed = true
            log.error(`A bot adapter stopped unexpectedly: ${err instanceof Error ? err.message : String(err)}`)
            void shutdown(1)
        })
    }

    await Promise.all(runtimes.map(runtime => runtime.start()))
    log.base('🚀 Bot is running!')
}

process.once('SIGINT', () => {
    void shutdown(failed ? 1 : 0)
})
process.once('SIGTERM', () => {
    void shutdown(failed ? 1 : 0)
})

main().catch((err) => {
    failed = true
    log.error(`❌ Failed to start bot: ${err instanceof Error ? err.message : String(err)}`)
    void shutdown(1)
})
