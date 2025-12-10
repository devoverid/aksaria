import type { Interaction } from 'discord.js'
import { decodeSnowflakes } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { PermissionsBitField } from 'discord.js'
import { EmbedRoleGrantButtonError } from '../handlers/role-grant-create-button'
import { EmbedRoleGrantModalError } from '../handlers/role-grant-create-modal'
import { RoleGrantCreateMessage } from '../messages/role-grant-create'

export class RoleGrantCreate extends RoleGrantCreateMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static getModalId(interaction: Interaction, customId: string) {
        const [prefix, guildId, channelId, roleId, buttonNameEnc] = decodeSnowflakes(customId)
        const buttonName = decodeURIComponent(buttonNameEnc)

        if (!guildId)
            throw new EmbedRoleGrantModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new EmbedRoleGrantModalError(this.ERR.NotGuild)
        if (!channelId)
            throw new EmbedRoleGrantModalError(this.ERR.ChannelNotFound)
        if (!roleId)
            throw new EmbedRoleGrantModalError(this.ERR.RoleMissing(roleId))

        return { prefix, guildId, channelId, roleId, buttonName }
    }

    static getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId, roleId] = decodeSnowflakes(customId)

        if (!guildId)
            throw new EmbedRoleGrantButtonError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new EmbedRoleGrantButtonError(this.ERR.NotGuild)
        if (!roleId)
            throw new EmbedRoleGrantButtonError(this.ERR.RoleMissing(roleId))

        return { prefix, guildId, roleId }
    }
}
