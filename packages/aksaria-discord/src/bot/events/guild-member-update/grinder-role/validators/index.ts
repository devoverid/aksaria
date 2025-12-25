import { WELCOME_NOTE_BUTTON_ID } from '@events/interaction-create/grinder-role/handlers/button'
import { encodeSnowflake, getCustomId } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { GrinderRoleMessage } from '../messages'

export class GrinderRole extends GrinderRoleMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]

    static generateButton(guildId: string): ActionRowBuilder<ButtonBuilder> {
        const noteButtonId = getCustomId([WELCOME_NOTE_BUTTON_ID, encodeSnowflake(guildId)])
        const noteButton = new ButtonBuilder()
            .setCustomId(noteButtonId)
            .setLabel('📜 Titah Perjalanan')
            .setStyle(ButtonStyle.Primary)

        return new ActionRowBuilder<ButtonBuilder>().addComponents(noteButton)
    }
}
