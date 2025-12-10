import type { Event } from '@events/event'
import type { Message, TextChannel } from 'discord.js'
import { CHECKIN_CHANNEL } from '@config/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { ChannelType, Events } from 'discord.js'
import { CheckIn } from '../validators/check-in'

export class CheckInError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckInError', message, options)
    }
}

export default {
    name: Events.MessageCreate,
    desc: 'Handle messages in channel for Check In event',
    async exec(_, msg: Message) {
        try {
            if (!msg.guild)
                throw new CheckInError(CheckIn.ERR.NotGuild)

            const channel = msg.channel as TextChannel
            CheckIn.assertMissPerms(msg.guild.members.me!, channel)

            if (channel.type !== ChannelType.GuildText)
                return

            if (channel.id !== CHECKIN_CHANNEL)
                return

            if (msg.author.bot)
                return

            await msg.delete()
            log.warn(`${channel.name}: deleted unauthorized message from '${msg.author.tag}'`)
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                log.error(`Failed to handle: ${CheckIn.ERR.UnexpectedCheckIn}: ${err}`)
        }
    },
} as Event
