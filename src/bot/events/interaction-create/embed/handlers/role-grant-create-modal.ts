import type { TextChannel } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { createEmbed, encodeSnowflake, generateCustomId, getCustomId } from '@utils/component'
import { getChannel, getRole, sendAsBot, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { RoleGrantCreate } from '../validators/role-grant-create'
import { EMBED_ROLE_GRANT_CREATE_BUTTON_ID } from './role-grant-create-button'

export class EmbedRoleGrantModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('EmbedRoleGrantModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const EMBED_ROLE_GRANT_CREATE_MODAL_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles modal submissions for creating an embed with a role-grant button.',
    id: EMBED_ROLE_GRANT_CREATE_MODAL_ID,
    errorTag: () => `${moduleName}: ${RoleGrantCreate.ERR.UnexpectedModal}`,
    async exec(_, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new EmbedRoleGrantModalError(RoleGrantCreate.ERR.NotGuild)

            const { channelId, roleId, buttonName } = RoleGrantCreate.getModalId(interaction, interaction.customId)
            const channel = await getChannel(interaction.guild, channelId) as TextChannel
            RoleGrantCreate.assertChannel(channel)
            RoleGrantCreate.assertMissPerms(interaction.guild.members.me!, channel)
            const role = await getRole(interaction.guild, roleId)
            RoleGrantCreate.assertRole(role)

            const title = interaction.fields.getTextInputValue('title')
            const description = interaction.fields.getTextInputValue('description')
            const color = interaction.fields.getTextInputValue('color')
            const footer = interaction.fields.getTextInputValue('footer')

            const embed = createEmbed(
                title,
                description,
                color,
                footer ? { text: footer } : null,
            )

            const buttonCustomId = getCustomId([
                EMBED_ROLE_GRANT_CREATE_BUTTON_ID,
                encodeSnowflake(interaction.guildId),
                encodeSnowflake(role.id),
            ])
            const button = new ButtonBuilder()
                .setCustomId(buttonCustomId)
                .setLabel(buttonName)
                .setStyle(ButtonStyle.Primary)
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

            await sendAsBot(interaction, channel, { embeds: [embed], components: [row] })
            await sendReply(interaction, `✅ Posted! Clicking will add <@&${role.id}> role~`)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
