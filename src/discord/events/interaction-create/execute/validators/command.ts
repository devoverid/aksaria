import type { Command } from '@discord/commands/command'
import type { ChatInputCommandInteraction } from 'discord.js'
import { ExecuteCommandError } from '@discord/events/interaction-create/execute/handlers/command'
import { DiscordAssert } from '@discord/utils/discord'
import { PermissionsBitField } from 'discord.js'
import { ExecuteCommandMessage } from '../messages/command'

export class ExecuteCommand extends ExecuteCommandMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static getCommand(interaction: ChatInputCommandInteraction) {
        const command: Command | undefined = interaction.client.commands.get(interaction.commandName)
        if (!command) {
            throw new ExecuteCommandError(this.ERR.NoMatchingCommand(interaction.commandName))
        }

        return command
    }
}
