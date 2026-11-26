import { DiscordAssert } from '@discord/utils/discord'
import { PingMessage } from '../messages/ping'

export class Ping extends PingMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
    ]
}
