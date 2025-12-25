import type { Attachment, Interaction } from 'discord.js'
import { decodeSnowflakes } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { PermissionsBitField } from 'discord.js'
import { SendModalError } from '../handlers/send-modal'
import { SendMessage } from '../messages/send'

export class Send extends SendMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static override ATTACHMENT_COUNT: number = 5

    static getModalId(interaction: Interaction, customId: string) {
        const [prefix, guildId, channelId, tempToken] = decodeSnowflakes(customId)

        if (!guildId)
            throw new SendModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new SendModalError(this.ERR.NotGuild)
        if (!channelId)
            throw new SendModalError(this.ERR.ChannelNotFound)

        return { prefix, guildId, channelId, tempToken }
    }

    static assertNotEmpty(attachments: Attachment[] | undefined, message: string | undefined) {
        if ((!attachments || attachments.length === 0) && (!message || message.trim().length === 0)) {
            throw new SendModalError(this.ERR.EmptyMessage)
        }
    }
}
