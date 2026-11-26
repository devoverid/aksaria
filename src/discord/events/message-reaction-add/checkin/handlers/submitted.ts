import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@discord/config/discord'
import { EVENT_PATH } from '@discord/events/index'
import { Checkin } from '@discord/events/interaction-create/checkin/validators'
import { registerReactionHandler } from '@discord/events/message-reaction-add/registry'
import { getMember } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'

export class SubmittedCheckinError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('SubmittedCheckinError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerReactionHandler({
    desc: 'Handles user-submitted checkin submissions with reacted by Flamewarden whether approved or rejected.',
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedSubmittedCheckinMessage}`,
    match: (_, user) => !user.bot,
    async exec(client, reaction, user) {
        const message = reaction.message
        const guild = message.guild
        if (!guild || !message.inGuild())
            throw new SubmittedCheckinError(Checkin.ERR.NotGuild)

        if (reaction.partial)
            await reaction.fetch()
        if (message.partial)
            await message.fetch()

        try {
            const flamewarden = await getMember(guild, user.id)
            const emoji = Checkin.assertEmojis(reaction.emoji.name)
            Checkin.assertMember(flamewarden)
            Checkin.assertMemberHasRole(flamewarden, FLAMEWARDEN_ROLE)
            await Checkin.assertAllowedTextChannel(guild, message.channel.id, CHECKIN_CHANNEL)

            await Checkin.validateCheckin(
                client,
                guild,
                flamewarden,
                { key: 'link', value: message.url },
                message.createdAt,
                Checkin.EMOJI_STATUS[emoji],
            )
        }
        catch (err: any) {
            if (!(err instanceof DiscordBaseError))
                throw err
        }
    },
})
