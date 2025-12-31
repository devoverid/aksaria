import type { TextChannel } from 'discord.js'
import { ResetGrinderRoles } from '@events/client-ready/jobs/validators/reset-grinder-roles'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'

export class ResetGrinderRolesButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ResetGrinderRolesButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const GOODBYE_NOTE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Opens goodbye note modal for users losing Grinder roles.',
    id: GOODBYE_NOTE_BUTTON_ID,
    errorTag: () => `${moduleName}: ${ResetGrinderRoles.ERR.UnexpectedButton}`,
    async exec(_, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new ResetGrinderRolesButtonError(ResetGrinderRoles.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            ResetGrinderRoles.assertMissPerms(interaction.guild.members.me!, channel)

            const { thread } = await ResetGrinderRoles.getButtonId(interaction, interaction.customId)

            await sendReply(interaction, ResetGrinderRoles.MSG.GoodByeNotes(thread))
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
