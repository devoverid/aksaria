import { PrismaClient } from '@generatedDB/client'

// Singleton Prisma client instance
let prismaInstance: PrismaClient | null = null

/**
 * Get the Prisma client singleton instance
 */
export function getPrismaClient(): PrismaClient {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient()
    }
    return prismaInstance
}

/**
 * Disconnect the Prisma client (useful for cleanup)
 */
export async function disconnectPrisma(): Promise<void> {
    if (prismaInstance) {
        await prismaInstance.$disconnect()
        prismaInstance = null
    }
}

// Re-export PrismaClient type for convenience
export type { PrismaClient }
export type { Prisma } from '@generatedDB/client'
