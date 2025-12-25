import type { Command } from '@commands'
import type { PrismaClient } from '@generatedDB/client'
import type { Collection } from 'discord.js'

declare module 'discord.js' {
    interface Client {
        prisma: PrismaClient
        commands: Collection<string, Command>
    }
}
