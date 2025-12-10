import type { Command } from '@commands/command'
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js'
import { LabelBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders'
import { EMBED_ROLE_GRANT_CREATE_MODAL_ID } from '@events/interaction-create/embed/handlers/role-grant-create-modal'
import { RoleGrantCreate } from '@events/interaction-create/embed/validators/role-grant-create'
import { encodeSnowflake, getCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { DUMMY } from '@utils/placeholder'
import { PermissionFlagsBits, SlashCommandBuilder, TextInputStyle } from 'discord.js'

export class EmbedRoleGrantError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('EmbedRoleGrantError', message, options)
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('create-embed-role-grant')
        .setDescription('Create an embed in a channel w/ a role-grant button.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(opt => opt.setName('role').setDescription('Role to grant.').setRequired(true))
        .addStringOption(opt => opt.setName('button-name').setDescription('Text to display on the button-make it catchy.').setRequired(true)),

    async execute(_, interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.inCachedGuild())
                throw new EmbedRoleGrantError(RoleGrantCreate.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            RoleGrantCreate.assertMissPerms(interaction.client.user, channel)

            const buttonName = interaction.options.getString('button-name', true)
            const role = interaction.options.getRole('role', true)

            const modalCustomId = getCustomId([
                EMBED_ROLE_GRANT_CREATE_MODAL_ID,
                encodeSnowflake(interaction.guildId!),
                encodeSnowflake(channel.id),
                encodeSnowflake(role.id),
                encodeURIComponent(buttonName),
            ])
            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle('Create Embed with Role-Grant Button')
                .addLabelComponents(
                    new LabelBuilder()
                        .setLabel('Title')
                        .setDescription('The title of embed')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('title')
                                .setPlaceholder(DUMMY.TITLE)
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(256)
                                .setRequired(true),
                        ),

                    new LabelBuilder()
                        .setLabel('Description')
                        .setDescription('Main embed content')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('description')
                                .setPlaceholder(DUMMY.DESC)
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true),
                        ),

                    new LabelBuilder()
                        .setLabel('Color')
                        .setDescription('Optional embed accent color (HEX)')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('color')
                                .setPlaceholder(DUMMY.COLOR)
                                .setValue(DUMMY.COLOR)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ),

                    new LabelBuilder()
                        .setLabel('Footer')
                        .setDescription('Optional embed footer text')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('footer')
                                .setPlaceholder(DUMMY.FOOTER)
                                .setValue(DUMMY.FOOTER)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ),
                )

            await interaction.showModal(modal)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${EMBED_ROLE_GRANT_CREATE_MODAL_ID}: ${RoleGrantCreate.ERR.UnexpectedRoleGrantCreate}: ${err}`)
        }
    },
} as Command
