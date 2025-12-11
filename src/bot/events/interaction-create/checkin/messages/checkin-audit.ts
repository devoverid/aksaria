import type { Checkin } from '@type/checkin'
import { DiscordAssert } from '@utils/discord'

export class CheckinAuditMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        CheckinShouldNotToday: (checkinMsgLink: string) => `❌ You cannot review [this check-in](${checkinMsgLink}). Please only audit check-ins from previous days`,
        CheckinNotDiffWithinDay: (checkin: Checkin, waitingCheckinList: string) => `
❌ Check-ins must be within 1 day of each other. Please validate [this check-in](${checkin.link!}) first:
${waitingCheckinList}
        `,
        UnexpectedCheckinAudit: '❌ Something went wrong during the check-in audit',
    }
}
