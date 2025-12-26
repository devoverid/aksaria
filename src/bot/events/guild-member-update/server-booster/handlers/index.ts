import type { TextChannel } from 'discord.js'
import { AURA_FARMING_CHANNEL } from '@config/discord'
import { registerGuildMemberUpdateHandler } from '@events/guild-member-update/registry'
import { EVENT_PATH } from '@events/index'
import { getChannel, sendAsBot } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { ServerBooster } from '../validators'

export class ServerBoosterError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ServerBoosterError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerGuildMemberUpdateHandler({
    desc: 'Watches server booster for members on guild member update.',
    errorTag: () => `${moduleName}: ${ServerBooster.ERR.UnexpectedServerBooster}`,
    async exec(_, oldMember, newMember) {
        try {
            if (!newMember.guild)
                throw new ServerBoosterError(ServerBooster.ERR.NotGuild)

            const wasBoosting = !!oldMember.premiumSince
            const isBoosting = !!newMember.premiumSince

            const justBoosted = !wasBoosting && isBoosting
            if (!justBoosted)
                return

            const channel = await getChannel(newMember.guild, AURA_FARMING_CHANNEL) as TextChannel
            ServerBooster.assertChannel(channel)

            const embed = ServerBooster.sayDeeplyThanksTo(newMember)

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
