import type { Command } from '@commands/command'
import type { ChatInputCommandInteraction, Client, GuildMember } from 'discord.js'
import { AUDIT_FLAME_CHANNEL, FLAMEWARDEN_ROLE, GRINDER_ROLE } from '@config/discord'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { SlashCommandBuilder } from 'discord.js'
import { CheckinStatus } from '../validators/checkin-status'

export class CheckinStatusError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinStatusError', message, options)
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('checkin-status')
        .setDescription('Check your current daily check-in and streak status.'),

    async execute(client: Client, interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.inCachedGuild())
                throw new CheckinStatusError(CheckinStatus.ERR.NotGuild)

            const channel = await CheckinStatus.assertAllowedChannel(interaction.guild, interaction.channelId, AUDIT_FLAME_CHANNEL)
            CheckinStatus.assertMissPerms(interaction.client.user, channel)

            const discordUserId: string = interaction.user.id
            const member = interaction.member as GuildMember
            const user = await CheckinStatus.getUser(client.prisma, discordUserId)

            CheckinStatus.assertMember(member)
            CheckinStatus.assertMemberHasRole(member, GRINDER_ROLE)

            const { content, embed } = await CheckinStatus.getEmbedStatusContent(
                interaction.guild,
                user.discord_id,
                user?.checkins?.[0],
            )

            await sendReply(interaction, content, false, { embeds: [embed], allowedMentions: { roles: [FLAMEWARDEN_ROLE] } })
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle: ${CheckinStatus.ERR.UnexpectedCheckinStatus}: ${err}`)
        }
    },
} as Command
