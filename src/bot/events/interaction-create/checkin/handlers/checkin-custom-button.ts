import type { Event } from '@events/event'
import type { Interaction, TextChannel } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { encodeSnowflake, generateCustomId, getCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events, LabelBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'
import { Checkin } from '../validators/checkin'
import { CHECKIN_CUSTOM_BUTTON_MODAL_ID } from './checkin-custom-button-modal'

export class CheckinCustomButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinCustomButtonError', message, options)
    }
}

export const CHECKIN_CUSTOM_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

export default {
    name: Events.InteractionCreate,
    desc: 'Opens review modal for a check-in',
    async exec(_, interaction: Interaction) {
        if (!interaction.isButton())
            return

        const isValid = Checkin.assertComponentId(interaction.customId, CHECKIN_CUSTOM_BUTTON_ID)
        if (!isValid)
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinCustomButtonError(Checkin.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.client.user, channel)
            const flamewarden = await interaction.guild.members.fetch(interaction.member.id)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)

            const { checkinId } = Checkin.getButtonId(interaction, interaction.customId)
            const modalCustomId = getCustomId([
                CHECKIN_CUSTOM_BUTTON_MODAL_ID,
                encodeSnowflake(interaction.guildId),
                encodeSnowflake(checkinId.toString()),
                encodeSnowflake(interaction.message.id),
            ])
            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle('Review Check-in')
                .addLabelComponents(
                    new LabelBuilder()
                        .setLabel('Review Status')
                        .setDescription('Approve or Reject this check-in')
                        .setStringSelectMenuComponent(
                            new StringSelectMenuBuilder()
                                .setCustomId('status')
                                .addOptions(
                                    new StringSelectMenuOptionBuilder().setLabel('❌ Reject').setValue('REJECTED').setDefault(true),
                                    new StringSelectMenuOptionBuilder().setLabel('🔥 Approve').setValue('APPROVED'),
                                ),
                        ),

                    new LabelBuilder()
                        .setLabel('Review Note')
                        .setDescription('Elaborate your thoughts')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('comment')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true),
                        ),
                )

            await interaction.showModal(modal)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${CHECKIN_CUSTOM_BUTTON_ID}: ${Checkin.ERR.UnexpectedButton}: ${err}`)
        }
    },
} as Event
