import { DiscordAssert } from '@utils/discord'
import { ServerBoosterMessage } from '../messages'

export class ServerBooster extends ServerBoosterMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]
}
