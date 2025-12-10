import type { ClientUser, Guild, GuildMember, Role, TextChannel } from 'discord.js'
import { getTempToken, tempStore } from '@utils/component'
import { ChannelType, PermissionsBitField } from 'discord.js'
import { getBotPerms, getChannel, getMissPerms } from '.'
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
            throw new DiscordAssertError(this.roleRevoked(roleId))
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

        const channel = await getChannel(guild, channelId)
        this.assertChannel(channel)

        return channel
    }

    static assertMissPerms(user: ClientUser | GuildMember, channel: TextChannel) {
        const channelPerms = getBotPerms(user, channel)
        const missedPerms = getMissPerms(channelPerms, this.BASE_PERMS)

        if (missedPerms.length) {
            const missingNames = missedPerms.map(p => this.PERM_LABELS.get(p) ?? 'Unknown Permission')

            throw new DiscordAssertError(this.ERR.RoleMissing(missingNames))
        }
    }

    static assertComponentId(modalId: string, id: string): boolean {
        if (!modalId.startsWith(id))
            return false

        return true
    }

    static isMemberHasRole(member: GuildMember, roleId: string): boolean {
        return member.roles.cache.has(roleId)
    }
}
