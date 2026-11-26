import { DiscordAssert } from '@discord/utils/discord'

export class PingMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedPing: '❌ Something went wrong while handling the ping command',
    }
}
