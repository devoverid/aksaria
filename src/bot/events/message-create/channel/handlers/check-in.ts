import type { TextChannel } from 'discord.js'
import { CHECKIN_CHANNEL } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerMessageHandler } from '@events/message-create/registry'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { log } from '@utils/logger'
import { ChannelType } from 'discord.js'
import { CheckIn } from '../validators/check-in'

export class CheckInError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckInError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerMessageHandler({
    desc: 'Handle messages in channel for Check In event.',
    errorTag: () => `${moduleName}: ${CheckIn.ERR.UnexpectedCheckIn}`,
    match: msg => !msg.author.bot && msg.channel.id === CHECKIN_CHANNEL && msg.channel.type === ChannelType.GuildText,
    async exec(_, msg) {
        try {
            if (!msg.guild || !msg.inGuild())
                throw new CheckInError(CheckIn.ERR.NotGuild)

            const channel = msg.channel as TextChannel
            CheckIn.assertMissPerms(msg.guild.members.me!, channel)

            await msg.delete()
            log.warn(`${channel.name}: deleted unauthorized message from '${msg.author.tag}'`)
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
