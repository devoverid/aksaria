import { DiscordAssert } from '@utils/discord'
import { PermissionsBitField } from 'discord.js'
import { CheckInMessage } from '../messages/check-in'

export class CheckIn extends CheckInMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.ManageMessages,
    ]
}
