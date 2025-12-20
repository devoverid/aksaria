import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { Checkin } from '@events/interaction-create/checkin/validators'
import { registerReactionHandler } from '@events/message-reaction-add/registry'
import { generateCustomId } from '@utils/component'
import { DiscordBaseError } from '@utils/discord/error'

export class SubmittedCheckinError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SubmittedCheckinError', message, options)
    }
}

export const SUBMITTED_CHECKIN_ID = generateCustomId(EVENT_PATH, __filename)

registerReactionHandler({
    id: SUBMITTED_CHECKIN_ID,
    desc: 'Handles user-submitted checkin submissions with reacted by Flamewarden whether approved or rejected.',
    errorTag: () => `${SUBMITTED_CHECKIN_ID}: ${Checkin.ERR.UnexpectedSubmittedCheckinMessage}`,
    match: (_, user) => !user.bot,
    async exec(client, reaction, user) {
        const message = reaction.message
        const guild = message.guild
        if (!guild || !message.inGuild())
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
                throw err
        }
    },
})
