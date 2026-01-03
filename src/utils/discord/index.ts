import type { Attachment, ChatInputCommandInteraction, ClientUser, FetchMembersOptions, Guild, GuildMember, Interaction, InteractionDeferReplyOptions, InteractionReplyOptions, MessageCreateOptions, PermissionsBitField, Role, TextChannel, ThreadChannel } from 'discord.js'
import { MessageFlags } from 'discord.js'

export async function getChannel(guild: Guild, id: string, isThread: boolean = false): Promise<TextChannel | ThreadChannel> {
    const cached = guild!.channels.cache.get(id)

    if (isThread) {
        return cached as TextChannel ?? await guild!.channels.fetch(id).then(channel => channel as TextChannel)
    }
    else {
        return cached as ThreadChannel ?? await guild!.channels.fetch(id).then(channel => channel as ThreadChannel)
    }
}

export async function getRole(guild: Guild, id: string): Promise<Role> {
    const cached = guild!.roles.cache.get(id)

    return cached as Role ?? await guild!.roles.fetch(id)
}

export async function getMember(guild: Guild, discordId: string) {
    const cached = guild.members.cache.get(discordId)

    return cached as GuildMember ?? await guild.members.fetch(discordId)
}

export async function getMembers(guild: Guild, userIds: string[], opts?: FetchMembersOptions) {
    return await guild.members.fetch({ user: userIds, ...opts })
}

export const getMissPerms = (channelPerms: Readonly<PermissionsBitField>, requiredPerms: bigint[]): bigint[] => requiredPerms.filter(p => !channelPerms.has(p))

export async function getBot(guild: Guild): Promise<GuildMember> {
    return guild!.members.me as GuildMember ?? await guild!.members.fetchMe()
}

export const getPerms = (user: ClientUser | GuildMember, channel: TextChannel): Readonly<PermissionsBitField> => channel.permissionsFor(user!)!

export function getAttachments(interaction: ChatInputCommandInteraction, fileCount: number): Attachment[] {
    const files: Attachment[] = []

    for (let i = 0; i <= fileCount; i++) {
        const file = interaction.options.getAttachment(`attachment-${i}`)
        if (file)
            files.push(file)
    }

    return files
}

export async function sendReply(
    interaction: Interaction,
    content: string,
    ephemeral = true,
    payloads?: InteractionReplyOptions,
    isDeferred = false,
    isDeferEphemeral = false,
) {
    if (!interaction.isRepliable())
        return null

    const opts: InteractionReplyOptions = { ...payloads, content }
    const deferOpts: InteractionDeferReplyOptions = {}

    if (ephemeral)
        opts.flags = MessageFlags.Ephemeral
    if (isDeferEphemeral)
        deferOpts.flags = MessageFlags.Ephemeral

    if (isDeferred) {
        await interaction.deferReply(deferOpts)
    }

    if (interaction.replied || interaction.deferred) {
        return await interaction.followUp(opts)
    }
    else {
        await interaction.reply(opts)
    }

    if (ephemeral)
        return null
}

export async function sendAsBot(
    interaction: Interaction | null,
    channel: TextChannel,
    payloads: InteractionReplyOptions,
    isTempMessage: boolean = false,
    isDeferred: boolean = false,
    isNextMessageEphemeral: boolean = false,
) {
    const { allowedMentions, components, content, embeds, files, poll, tts } = payloads
    const opts: MessageCreateOptions = { allowedMentions, components, content, embeds, files, poll, tts }
    const deferOpts: InteractionDeferReplyOptions = {}

    if (isNextMessageEphemeral)
        deferOpts.flags = MessageFlags.Ephemeral

    if (interaction) {
        if (!interaction.isRepliable())
            return

        if (isDeferred)
            await interaction.deferReply(deferOpts)
    }

    const msg = await channel.send(opts)
    if (isTempMessage)
        setTimeout(() => msg?.delete().catch(() => {}), 5000)

    return msg
}

export * from './assert'
export * from './message'
