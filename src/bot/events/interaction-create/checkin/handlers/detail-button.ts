import type { GuildMember, TextChannel } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'

export class CheckinDetailButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinDetailButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_DETAIL_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles displaying more details for a user check-in when the detail button is pressed.',
    id: CHECKIN_DETAIL_BUTTON_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(client, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinDetailButtonError(Checkin.ERR.NotGuild)

            const { checkinId } = Checkin.getButtonId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            const member = interaction.member as GuildMember
            Checkin.assertMissPerms(interaction.client.user, channel)
            Checkin.assertMember(member)
            Checkin.assertMemberGrindRoles(member)

            const checkin = await Checkin.getCheckin(client.prisma, checkinId)
            const prevCheckin = await Checkin.getPrevCheckin(client.prisma, checkin.user!.id, checkin.checkin_streak!, checkin)

            await sendReply(interaction, Checkin.MSG.GrinderDetails(checkin, prevCheckin))
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
