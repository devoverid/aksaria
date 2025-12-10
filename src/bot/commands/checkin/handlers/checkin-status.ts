import type { Command } from '@commands/command'
import type { User } from '@type/user'
import type { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember } from 'discord.js'
import { AUDIT_FLAME_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { Checkin } from '@events/interaction-create/checkin/validators/checkin'
import { createEmbed } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { DUMMY } from '@utils/placeholder'
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
            CheckinStatus.assertMissPerms(interaction, channel)

            const discordUserId: string = interaction.user.id
            const member = interaction.member as GuildMember
            const user = await client.prisma.user.findFirst({
                where: {
                    discord_id: discordUserId,
                },
                select: {
                    id: true,
                    discord_id: true,
                    created_at: true,
                    updated_at: true,
                    checkin_streaks: {
                        take: 1,
                        orderBy: { first_date: 'desc' },
                        include: { checkins: true },
                    },
                    checkins: {
                        orderBy: { created_at: 'desc' },
                        take: 1,
                        include: { checkin_streak: true },
                    },
                },
            }) as User
            const currCheckinStreak = user?.checkin_streaks?.[0]
            const currCheckin = user?.checkins?.[0]

            let embed: EmbedBuilder
            let content = ''
            const hasCheckedInToday = Checkin.hasCheckinToday(currCheckinStreak, currCheckin)
            if (hasCheckedInToday && currCheckin) {
                const flamewarden = await interaction.guild.members.fetch(currCheckin.reviewed_by!)
                if (currCheckin.status === 'WAITING') {
                    content = `<@&${FLAMEWARDEN_ROLE}>`
                    embed = createEmbed(
                        '🧭 Daily Check-In Status',
                        CheckinStatus.MSG.WaitingCheckin(member, currCheckin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                }
                else if (currCheckin.status === 'APPROVED') {
                    embed = createEmbed(
                        '🔥 Daily Check-In Status',
                        CheckinStatus.MSG.ApprovedCheckin(flamewarden, currCheckin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                }
                else {
                    embed = createEmbed(
                        '❌ Daily Check-In Status',
                        CheckinStatus.MSG.RejectedCheckin(member, flamewarden, currCheckin),
                        DUMMY.COLOR,
                        { text: DUMMY.FOOTER },
                    )
                }
            }
            else {
                embed = createEmbed(
                    '🧐 Daily Check-In Status',
                    CheckinStatus.MSG.NoCheckin(member, currCheckinStreak),
                    DUMMY.COLOR,
                    { text: DUMMY.FOOTER },
                )
            }

            await sendReply(interaction, content, false, { embeds: [embed], allowedMentions: { roles: [FLAMEWARDEN_ROLE] } })
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle: ${CheckinStatus.ERR.UnexpectedCheckinStatus}: ${err}`)
        }
    },
} as Command
