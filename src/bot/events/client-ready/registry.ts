import type { Client } from 'discord.js'

export interface ClientReadyHandler {
    desc: string
    id: string
    errorTag: () => string
    exec: (client: Client) => Promise<void> | void
}

export const clientReadyHandlers: ClientReadyHandler[] = []

export function registerClientReadyHandler(handler: ClientReadyHandler) {
    clientReadyHandlers.push(handler)
}
