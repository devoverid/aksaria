import type { Message } from 'discord.js'
import { DiscordAssert } from '@utils/discord'
import { MessageType } from 'discord.js'
import { ServerBoosterMessage } from '../messages'

export class ServerBooster extends ServerBoosterMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]

    static readonly DISCORD_BOOST_MESSAGES = [
        MessageType.GuildBoost,
        MessageType.GuildBoostTier1,
        MessageType.GuildBoostTier2,
        MessageType.GuildBoostTier3,
    ]

    static isBoostSystemMessage(message: Message): boolean {
        return this.DISCORD_BOOST_MESSAGES.includes(message.type)
    }
}
