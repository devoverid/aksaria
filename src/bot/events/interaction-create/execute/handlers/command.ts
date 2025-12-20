import type { Command } from '@commands/command'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { EVENT_PATH } from '../../..'
import { registerInteractionHandler } from '../../registry'
import { ExecuteCommand } from '../validators/command'

export class ExecuteCommandError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ExecuteCommandError', message, options)
    }
}

export const EXECUTE_COMMAND_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Executing a command when an interaction is created.',
    id: EXECUTE_COMMAND_ID,
    errorTag: () => `${EXECUTE_COMMAND_ID}`,
    async exec(client, interaction) {
        if (!interaction.isChatInputCommand())
            return

        try {
            const command: Command = ExecuteCommand.getCommand(interaction)
            await command.execute(client, interaction)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
