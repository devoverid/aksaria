import type { Command } from '@discord/commands/command'
import { EVENT_PATH } from '@discord/events/index'
import { sendReply } from '@discord/utils/discord'
import { DiscordBaseError } from '@discord/utils/discord/error'
import { getModuleName } from '@discord/utils/io'
import { registerInteractionHandler } from '../../registry'
import { ExecuteCommand } from '../validators/command'

export class ExecuteCommandError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('ExecuteCommandError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)

registerInteractionHandler({
    desc: 'Executing a command when an interaction is created.',
    errorTag: () => `${moduleName}: ${ExecuteCommand.ERR.UnexpectedExecuteCommand}`,
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
