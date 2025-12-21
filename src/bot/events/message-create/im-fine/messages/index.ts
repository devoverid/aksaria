import { DiscordAssert } from '@utils/discord'

export class ImFineMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedImFine: '❌ Something went wrong while handling the Im Fine message',
    }
}
