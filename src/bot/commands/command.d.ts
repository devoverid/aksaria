import type { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js'

export interface Command {
    data: SlashCommandBuilder
    execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>
}
