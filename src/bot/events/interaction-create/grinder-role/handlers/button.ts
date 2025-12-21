import type { TextChannel } from 'discord.js'
import { GrinderRole } from '@events/guild-member-update/grinder-role/validators'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'

export class GrinderRoleButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('GrinderRoleButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const WELCOME_NOTE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Opens welcome note modal for users receiving Grinder roles.',
    id: WELCOME_NOTE_BUTTON_ID,
    errorTag: () => `${moduleName}: ${GrinderRole.ERR.UnexpectedButton}`,
    async exec(_, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new GrinderRoleButtonError(GrinderRole.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            GrinderRole.assertMissPerms(interaction.client.user, channel)

            await sendReply(interaction, GrinderRole.MSG.WelcomeNotes)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
