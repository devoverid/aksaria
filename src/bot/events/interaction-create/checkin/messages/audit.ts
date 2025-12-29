import type { Checkin } from '@type/checkin'
import { getNow, getParsedNow } from '@utils/date'
import { DiscordAssert } from '@utils/discord'

export class CheckinAuditMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        CheckinShouldNotToday: (checkinMsgLink: string) => `❌ You cannot review [this check-in](${checkinMsgLink}). Please only audit check-ins from previous days`,
        CheckinNotDiffWithinDay: (checkin: Checkin, waitingCheckinList: string) => `
❌ Check-ins must be within 1 day of each other. Please validate [this check-in](${checkin.link!}) first:
${waitingCheckinList}
        `,
        NotClarificationThread: '❌ This thread does not correspond to the correct check-in. Please make sure you are reviewing the correct clarification thread',
        NoOldestCheckins: '❌ There are no waiting check-ins to audit for this user.',
        UnexpectedCheckinAudit: '❌ Something went wrong during the check-in audit',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        AuditSuccess: (guildName: string, checkinLink: string, flamewardenId: string, userDiscordId: string) => `
Wahai Tuan/Nona <@${userDiscordId}>,
[percikan](${checkinLink}) yang Tuan/Nona titipkan telah selesai ditakar dan ditetapkan.
🗓 **Audited At**: ${getParsedNow(getNow())}
👀 **Audited By**: <@${flamewardenId}>

> *"Api telah diuji, dan keputusannya kini tercatat dalam ${guildName}."*
        `,
    }
}
