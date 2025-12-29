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
        NoOldestCheckins: '❌ There are no waiting check-ins to audit for this user',
        ThreadMessageMissingEmbed: '❌ The thread message is missing the expected embed. Please ensure the clarification thread contains an embed',
        ThreadMessageMissingTitle: '❌ The thread message embed is missing a title. Please ensure the embed contains a check-in ID in its title',
        ThreadOrEmbedMissingId: '❌ Could not find the check-in ID in the thread name or in the embed title',
        ThreadIdEmbedIdMismatch: '❌ The check-in ID in the thread name does not match the embed title. Please verify that you are reviewing the correct thread',
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
