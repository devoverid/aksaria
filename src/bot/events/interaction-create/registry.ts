import type { Client, Interaction } from 'discord.js'

export interface InteractionHandler {
    desc: string
    id?: string
    errorTag: () => string
    match?: (interaction: Interaction) => boolean
    exec: (client: Client, interaction: Interaction) => Promise<void> | void
}

export const interactionHandlerMap = new Map<string, InteractionHandler>()
export const interactionHandlers: InteractionHandler[] = []

export function registerInteractionHandler(handler: InteractionHandler) {
    if (handler.id)
        interactionHandlerMap.set(handler.id, handler)
    else
        interactionHandlers.push(handler)
}
