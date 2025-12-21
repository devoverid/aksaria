import type { Command } from '@commands/command'
import { EVENT_PATH } from '@events/index'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
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
