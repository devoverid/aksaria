import type { TextChannel } from 'discord.js'
import { SYSTEM_ASHES_CHANNEL } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerMessageHandler } from '@events/message-create/registry'
import { sendAsBot } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { ServerBooster } from '../validators'

export class ServerBoosterError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ServerBoosterError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerMessageHandler({
    desc: 'Watches server boost system messages (including re-boosts).',
    errorTag: () => `${moduleName}: ${ServerBooster.ERR.UnexpectedServerBooster}`,
    match: msg => msg.system && msg.channelId === SYSTEM_ASHES_CHANNEL && !!msg.member && ServerBooster.isBoostSystemMessage(msg),
    async exec(_, msg) {
        try {
            if (!msg.guild || !msg.inGuild())
                throw new ServerBoosterError(ServerBooster.ERR.NotGuild)

            const channel = msg.channel as TextChannel
            ServerBooster.assertChannel(channel)
            ServerBooster.assertMissPerms(msg.guild.members.me!, channel)
            const member = msg.member!
            ServerBooster.assertMember(member)

            const embed = ServerBooster.sayDeeplyThanksTo(member)

            await sendAsBot(null, channel, {
                content: ServerBooster.MSG.SpecialThanks,
                embeds: [embed],
            })
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
