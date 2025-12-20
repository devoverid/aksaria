import type { Client, Interaction } from 'discord.js'

export interface InteractionHandler {
    desc: string
    id: string
    errorTag: () => string
    exec: (client: Client, interaction: Interaction) => Promise<void> | void
}

export const interactionHandlers = new Map<string, InteractionHandler>()

export function registerInteractionHandler(handler: InteractionHandler) {
    interactionHandlers.set(handler.id, handler)
}
