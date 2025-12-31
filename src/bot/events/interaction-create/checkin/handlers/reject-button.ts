import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { getBot, getMember, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'

export class CheckinRejectButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinRejectButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_REJECT_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles check-in reject button interactions and rejects user check-in.',
    id: CHECKIN_REJECT_BUTTON_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(client, interaction) {
        if (!interaction.isButton())
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinRejectButtonError(Checkin.ERR.NotGuild)

            const { checkinId, checkinCreatedAt } = Checkin.getButtonId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            const bot = await getBot(interaction.guild)
            Checkin.assertMissPerms(bot, channel)
            const flamewarden = await getMember(interaction.guild, interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            await Checkin.validateCheckin(
                client,
                interaction.guild,
                flamewarden,
                { key: 'id', value: checkinId },
                checkinCreatedAt,
                'REJECTED',
            )
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
