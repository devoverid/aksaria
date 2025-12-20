import type { Event } from '@events/event'
import type { Interaction, TextChannel } from 'discord.js'
import { ResetGrinderRoles } from '@events/client-ready/jobs/validators/reset-grinder-roles'
import { EVENT_PATH } from '@events/index'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'

export class ResetGrinderRolesButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ResetGrinderRolesButtonError', message, options)
    }
}

export const GOODBYE_NOTE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

export default {
    name: Events.InteractionCreate,
    desc: 'Opens goodbye note modal for users losing Grinder roles.',
    async exec(_, interaction: Interaction) {
        if (!interaction.isButton())
            return

        const isValid = ResetGrinderRoles.assertComponentId(interaction.customId, GOODBYE_NOTE_BUTTON_ID)
        if (!isValid)
            return

        try {
            if (!interaction.inCachedGuild())
                throw new ResetGrinderRolesButtonError(ResetGrinderRoles.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            ResetGrinderRoles.assertMissPerms(interaction.client.user, channel)

            await sendReply(interaction, ResetGrinderRoles.MSG.GoodByeNotes)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${GOODBYE_NOTE_BUTTON_ID}: ${ResetGrinderRoles.ERR.UnexpectedButton}: ${err}`)
        }
    },
} as Event
