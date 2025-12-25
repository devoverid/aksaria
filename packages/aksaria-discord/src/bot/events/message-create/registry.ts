import type { Client, Message } from 'discord.js'

export interface MessageHandler {
    desc: string
    errorTag: () => string
    match?: (msg: Message) => boolean
    exec: (client: Client, msg: Message) => Promise<void> | void
}

export const messageHandlers: MessageHandler[] = []

export function registerMessageHandler(handler: MessageHandler) {
    messageHandlers.push(handler)
}
