import type { CheckinStatusType } from '@discord/types/checkin'
import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@discord/config/discord'
import { EVENT_PATH } from '@discord/events/index'
import { registerInteractionHandler } from '@discord/events/interaction-create/registry'
import { generateCustomId } from '@discord/utils/component'
import { getBot, getMember, sendReply } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { Checkin } from '../validators'

export class CheckinCustomButtonModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinCustomButtonModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_CUSTOM_BUTTON_MODAL_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles modal submissions for the custom check-in review modal.',
    id: CHECKIN_CUSTOM_BUTTON_MODAL_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedModal}`,
    async exec(client, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            await interaction.deferUpdate()

            if (!interaction.inCachedGuild())
                throw new CheckinCustomButtonModalError(Checkin.ERR.NotGuild)

            const { checkinId, checkinCreatedAt } = Checkin.getModalReviewId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            const bot = await getBot(interaction.guild)
            Checkin.assertMissPerms(bot, channel)
            const flamewarden = await getMember(interaction.guild, interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const status = interaction.fields.getStringSelectValues('status')[0] as CheckinStatusType
            const comment = interaction.fields.getTextInputValue('comment')

            await Checkin.validateCheckin(
                client,
                interaction.guild,
                flamewarden,
                { key: 'id', value: checkinId },
                checkinCreatedAt,
                status,
                comment,
            )
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
