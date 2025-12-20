import type { TextChannel } from 'discord.js'
import { CHECKIN_CHANNEL } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerMessageHandler } from '@events/message-create/registry'
import { generateCustomId } from '@utils/component'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { ChannelType } from 'discord.js'
import { CheckIn } from '../validators/check-in'

export class CheckInError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckInError', message, options)
    }
}

export const CHECK_IN_CHANNEL_ID = generateCustomId(EVENT_PATH, __filename)

registerMessageHandler({
    id: CHECK_IN_CHANNEL_ID,
    desc: 'Handle messages in channel for Check In event.',
    errorTag: () => `${CHECK_IN_CHANNEL_ID}: ${CheckIn.ERR.UnexpectedCheckIn}`,
    match: msg => msg.channel.id === CHECKIN_CHANNEL,
    async exec(_, msg) {
        try {
            if (!msg.guild)
                throw new CheckInError(CheckIn.ERR.NotGuild)

            const channel = msg.channel as TextChannel
            CheckIn.assertMissPerms(msg.guild.members.me!, channel)

            if (channel.type !== ChannelType.GuildText)
                return
            if (msg.author.bot)
                return

            await msg.delete()
            log.warn(`${channel.name}: deleted unauthorized message from '${msg.author.tag}'`)
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
