import type { Client, MessageReaction, User } from 'discord.js'

export interface ReactionHandler {
    desc: string
    errorTag: () => string
    match?: (reaction: MessageReaction, user: User) => boolean
    exec: (client: Client, reaction: MessageReaction, user: User) => Promise<void> | void
}

export const reactionHandlers: ReactionHandler[] = []

export function registerReactionHandler(handler: ReactionHandler) {
    reactionHandlers.push(handler)
}
