import type { Event } from '@events/event'
import type { Client, MessageReaction, PartialMessageReaction, User } from 'discord.js'
import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { Checkin } from '@events/interaction-create/checkin/validators/checkin'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'

export class SubmittedCheckinError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SubmittedCheckinError', message, options)
    }
}

export default {
    name: Events.MessageReactionAdd,
    desc: 'Handles user-submitted checkin submissions with reacted by Flamewarden whether approved or rejected.',
    async exec(client: Client, reaction: MessageReaction | PartialMessageReaction, user: User) {
        const message = reaction.message
        const guild = message.guild
        if (user.bot)
            return
        if (!message.inGuild() || !guild)
            return
        if (reaction.partial)
            await reaction.fetch()
        if (message.partial)
            await message.fetch()

        try {
            const flamewarden = await guild.members.fetch(user.id)
            const emoji = Checkin.assertEmojis(reaction.emoji.name)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)
            await Checkin.assertAllowedChannel(guild, message.channel.id, CHECKIN_CHANNEL)

            await Checkin.validateCheckin(
                client.prisma,
                guild,
                flamewarden,
                { key: 'link', value: message.url },
                message,
                Checkin.EMOJI_STATUS[emoji],
            )
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                log.error(`Failed to handle: ${Checkin.ERR.UnexpectedSubmittedCheckinMessage}: ${err}`)
        }
    },
} as Event
