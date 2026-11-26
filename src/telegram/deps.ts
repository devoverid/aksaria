import type { PrismaClient } from '@generatedDB/client'

export interface TelegramDeps {
    prisma: PrismaClient
    chatId: string
    botId: number
    botUsername: string
    memberTag: string
    now: () => Date
}
