import type { Command } from '@commands/command'
import type { Event } from '@events/event'
import type { Client, Interaction } from 'discord.js'
import { Events, MessageFlags } from 'discord.js'

export default {
    name: Events.InteractionCreate,
    desc: 'Executing a command when an interaction is created.',
    async exec(client: Client, interaction: Interaction) {
        if (!interaction.isChatInputCommand())
            return
        const command: Command | undefined = interaction.client.commands.get(interaction.commandName)
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`)
            return
        }

        try {
            await command.execute(client, interaction)
        }
        catch (error) {
            console.error(error)
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral })
            }
            else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral })
            }
        }
    },
} as Event
