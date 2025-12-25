import type { Client, ClientEvents } from 'discord.js'

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
    name: K
    desc: string
    once?: boolean
    exec: (client: Client, ...args: any[]) => void
}
