import type { TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { createCheckinReviewModal, encodeSnowflake, generateCustomId, getCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'
import { CHECKIN_CUSTOM_BUTTON_MODAL_ID } from './custom-button-modal'

export class CheckinCustomButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinCustomButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_CUSTOM_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Opens review modal for a check-in',
    id: CHECKIN_CUSTOM_BUTTON_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(client, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinCustomButtonError(Checkin.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.guild.members.me!, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const { checkinId, checkinCreatedAt } = Checkin.getButtonId(interaction, interaction.customId)
            const checkin = await Checkin.getWaitingCheckin(client.prisma, 'id', checkinId)
            const modalCustomId = getCustomId([
                CHECKIN_CUSTOM_BUTTON_MODAL_ID,
                encodeSnowflake(interaction.guildId),
                encodeSnowflake(checkinId.toString()),
                checkinCreatedAt.getTime().toString(),
            ])
            const modal = createCheckinReviewModal(modalCustomId, checkin)

            await interaction.showModal(modal)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
