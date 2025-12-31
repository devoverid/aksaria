import type { ClientUser, Guild, GuildMember, Message, Role, TextChannel, ThreadAutoArchiveDuration, ThreadChannel } from 'discord.js'
import { getTempToken, parseMessageLink, tempStore } from '@utils/component'
import { ChannelType, PermissionsBitField } from 'discord.js'
import { getChannel, getMissPerms, getPerms } from '.'
import { DiscordBaseError } from './error'
import { DiscordMessage } from './message'

class DiscordAssertError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('DiscordAssertError', message, options)
    }
}

export class DiscordAssert extends DiscordMessage {
    static BASE_PERMS: bigint[] = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.EmbedLinks,
    ]

    static PERM_LABELS = new Map<bigint, string>(
        Object.entries(PermissionsBitField.Flags).map(([key, value]) => [
            value,
            key.replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase()),
        ]),
    )

    static ATTACHMENT_COUNT = 10
    static THREAD_ARCHIVE_DURATION: ThreadAutoArchiveDuration = 1440

    static getMessageFromLink(link: string) {
        const data = parseMessageLink(link)

        if (!data)
            throw new DiscordAssertError(this.ERR.MessageLinkInvalid)

        return { ...data }
    }

    static async getThreadMessage(thread: ThreadChannel) {
        const starterMessage = await thread.fetchStarterMessage()
        if (!starterMessage) {
            throw new DiscordAssertError(this.ERR.FailedToFetchThreadFirstMessage)
        }

        return starterMessage
    }

    static setTempItem(items: any): string {
        const token = getTempToken()
        tempStore.set(token, items)

        return token
    }

    static delTempItem(items: any, token: string) {
        if (items)
            tempStore.delete(token)
    }

    static assertMember(member: GuildMember) {
        if (!member || !('roles' in member))
            throw new DiscordAssertError(this.ERR.NoMember)
    }

    static assertRoleManageable(guild: Guild, bot: GuildMember, role: Role) {
        if (!role.editable)
            throw new DiscordAssertError(this.ERR.RoleUneditable)
        if (role.managed || role.id === guild.roles.everyone.id)
            throw new DiscordAssertError(this.ERR.RoleUneditable)
        if (bot.roles.highest.comparePositionTo(role) <= 0)
            throw new DiscordAssertError(this.ERR.MemberAboveMe)
    }

    static assertChannel(channel: TextChannel) {
        if (!channel || channel.type !== ChannelType.GuildText)
            throw new DiscordAssertError(this.ERR.ChannelNotFound)
    }

    static assertRole(role: Role) {
        if (!role)
            throw new DiscordAssertError(this.ERR.RoleNotFound)
    }

    static assertMemberAlreadyHasRole(member: GuildMember, roleId: string) {
        if (this.isMemberHasRole(member, roleId))
            throw new DiscordAssertError(this.MSG.RoleRevoked(roleId))
    }

    static assertMemberHasRole(member: GuildMember, roleId: string) {
        const hasThisRole = this.isMemberHasRole(member, roleId)

        if (!hasThisRole)
            throw new DiscordAssertError(this.ERR.RoleMissing(roleId))
    }

    static async assertAllowedChannel(guild: Guild, currentChannelId: string, channelId: string) {
        if (currentChannelId !== channelId) {
            throw new DiscordAssertError(this.ERR.AllowedChannel(channelId))
        }

        const channel = await getChannel(guild, channelId) as TextChannel
        this.assertChannel(channel)

        return channel
    }

    static assertMissPerms(user: ClientUser | GuildMember, channel: TextChannel) {
        const channelPerms = getPerms(user, channel)
        const missedPerms = getMissPerms(channelPerms, this.BASE_PERMS)

        if (missedPerms.length) {
            const missingNames = missedPerms.map(p => this.PERM_LABELS.get(p) ?? 'Unknown Permission')

            throw new DiscordAssertError(this.ERR.RoleMissing(missingNames))
        }
    }

    static assertHasThread(message: Message) {
        if (message.hasThread && message.hasThread) {
            throw new DiscordAssertError(this.ERR.ChannelAlreadyHasThread)
        }
    }

    static async assertThreadUnderChannel(guild: Guild, currentChannelId: string, parentChannel: TextChannel) {
        const thread = await getChannel(guild, currentChannelId) as ThreadChannel

        if (!thread.isThread())
            throw new DiscordAssertError(this.ERR.MustBeThread(parentChannel.id))

        if ('parentId' in thread && thread.parentId !== parentChannel.id)
            throw new DiscordAssertError(this.ERR.MustBeThread(parentChannel.id))

        return thread
    }

    static assertNotArchivedThread(thread: ThreadChannel) {
        if (thread.archived) {
            throw new DiscordAssertError(this.ERR.ArchivedThread)
        }
    }

    static assertNotPrivateThread(thread: ThreadChannel) {
        if (thread.type === ChannelType.PrivateThread) {
            throw new DiscordAssertError(this.ERR.PrivateThread)
        }
    }

    static assertThreadMessageSendBy(threadMessage: Message, userId: string) {
        if (threadMessage.author.id !== userId) {
            throw new DiscordAssertError(this.ERR.ThreadMessageShouldSendBy(userId))
        }
    }

    static isMemberHasRole(member: GuildMember, roleId: string): boolean {
        return member.roles.cache.has(roleId)
    }
}
