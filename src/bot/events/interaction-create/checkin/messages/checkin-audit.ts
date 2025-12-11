import { DiscordAssert } from '@utils/discord'

export class CheckinAuditMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedCheckinAudit: '❌ Something went wrong during the check-in audit',
    }
}
