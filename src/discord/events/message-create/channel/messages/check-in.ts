import { DiscordAssert } from '@discord/utils/discord'

export class CheckInMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedCheckIn: '❌ Something went wrong while handling the Check-In message',
    }
}
