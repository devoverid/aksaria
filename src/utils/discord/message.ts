import type { GrindRole } from '@config/discord'
import { formatList } from '@utils/text'

export class DiscordMessage {
    static readonly ERR = {
        NoMember: '❌ Couldn’t resolve your member record',
        NotGuild: '❌ This action must be used in a server',
        ChannelNotFound: '❌ Channel not found',
        RoleUneditable: '❌ I can’t manage that role (check role hierarchy/managed role/@everyone)',
        MemberAboveMe: '❌ I can’t change roles for this member (their highest role is at/above mine)',
        RoleNotFound: '❌ The role no longer exists',
        RoleMissing(role: string | string[]): string {
            if (typeof role === 'string') {
                return `❌ Missing role: <@&${(role)}>`
            }

            return `❌ I’m missing **${formatList(role)}** in this channel.`
        },
        AllowedChannel: (channelId: string) => `❌ You can't do anything on this channel. You need to go to <#${channelId}>`,
        GuildMissing: '❌ The guild could not be found',
        CannotPost: '❌ I can’t post in that channel',
        MessageIdMissing: '❌ Message ID is missing or invalid',
        MessageLinkInvalid: '❌ The provided message link is invalid',
        ChannelAlreadyHasThread: '❌ This channel message already has an associated thread',
        MustBeThread: (parentChannelId: string) => `❌ This action can only be performed in a thread under <#${parentChannelId}>`,
        ArchivedThread: '❌ This thread is archived',
        PrivateThread: '❌ This action cannot be performed in a private thread',
        FailedToFetchThreadFirstMessage: '❌ Failed to fetch the first message in this thread',
        ThreadMessageShouldSendBy: (userId: string) => `❌ The first thread message must be sent by <@${userId}> to perform this action`,

        PlainMessage: '❌ There is nothing to do with this plain message',
        CheckinIdMissing: '❌ Check-in ID is missing or invalid',
        CheckinIdInvalid: '❌ The provided check-in ID is invalid',
        CheckinDateMissing: '❌ Check-in date is missing or invalid',
        CheckinDateInvalid: '❌ The check-in date is invalid',

        UnexpectedModal: '❌ Something went wrong while handling the modal component',
        UnexpectedButton: '❌ Something went wrong while handling the button component',
        UnexpectedEmoji: '❌ You used an invalid emoji for this action',
    }

    static readonly MSG = {
        ReachNewGrindRole(role: GrindRole) {
            return `🎉 You have reached a new grind role: <@&${(role.id)}>~`
        },
        RoleGranted(roleId: string): string {
            return `✅ Granted <@&${(roleId)}> to you`
        },
        RoleRevoked(roleId: string): string {
            return `❌ You already have the <@&${(roleId)}> role`
        },
    }
}
