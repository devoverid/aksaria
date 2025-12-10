import { DiscordAssert } from '@utils/discord'
import { PermissionsBitField } from 'discord.js'
import { CheckinStatusMessage } from '../messages/checkin-status'

export class CheckinStatus extends CheckinStatusMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]
}
