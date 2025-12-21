import { DiscordAssert } from '@utils/discord'

export class SayHelloMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedSayHello: '❌ Something went wrong while handling the say hello event',
    }
}
