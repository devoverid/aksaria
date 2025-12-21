import type { Checkin } from '@type/checkin'
import type { GuildMember } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { getNow, getParsedNow } from '@utils/date'
import { DiscordAssert } from '@utils/discord'
import { DUMMY } from '@utils/placeholder'

export class CheckinMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        AlreadyCheckinToday: (checkinMsgLink: string) => `❌ You already have a [check-in for today](${checkinMsgLink}). Please come back tomorrow`,
        SubmittedCheckinNotToday: (checkinMsgLink: string) => `❌ This [submitted check-in](${checkinMsgLink})'s date should equals as today. You can't review this anymore`,
        UnknownCheckinStatus: '❌ The status for this check-in is unknown or unexpected',
        UnexpectedSubmittedCheckinMessage: '❌ Something went wrong while submitting your check-in',
        UnexpectedCheckin: '❌ Something went wrong during check-in',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        CheckinSuccess: (todo: string) => `
# ✅ Check-In Baru Terdeteksi!
*Kindly take a look and do a review for this one, <@&${FLAMEWARDEN_ROLE}>*

⋆｡˚ ☁︎ ˚｡⋆｡˚☽˚｡⋆
${todo}

> ${DUMMY.FOOTER}`,

        GrinderDetails: (checkin: Checkin, lastCheckin?: Checkin) => `
✨─────✨/✨━━━━✨
🌟 **Grinder:** <@${checkin.user!.discord_id}>
📁 **Attachment:** ${checkin.attachments && checkin.attachments.length > 0 ? '✅' : '❌'}
🕓 **Date:** ${getParsedNow(getNow(checkin.created_at))}
🔥 **Current Streak:** ${checkin.checkin_streak!.streak} day(s)
🗓 **Last Check-In:** ${lastCheckin ? `[${getParsedNow(getNow(lastCheckin.created_at))}](${lastCheckin.link})` : '-'}
        `,

        CheckinSuccessToMember: (checkin: Checkin) => `
Sebuah [check-in](${checkin.link}) baru telah Tuan/Nona serahkan dan kini menunggu pemeriksaan dari Flamewarden. 
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🗓 **Submitted At**: ${getParsedNow(getNow(checkin.created_at))}

> 🔎 Sedang menunggu peninjauan Flamewarden; mohon Tuan/Nona bersabar`,

        CheckinApproved: (flamewarden: GuildMember, checkin: Checkin) => `
[Nyala api](${checkin.link}) Tuan/Nona berkobar lebih terang pada hari ini.
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🔥 **Current Streak**: ${checkin.checkin_streak!.streak}
🗓 **Approved At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Approved By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}

> 🔥 Konsistensi ialah bahan bakar nyala api; teruskan langkah Tuan/Nona`,

        CheckinRejected: (flamewarden: GuildMember, checkin: Checkin) => `
[Check-in ini](${checkin.link}) tidak memenuhi syarat dan dengan demikian telah ditolak.
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🔥 **Current Streak**: ${checkin.checkin_streak!.streak}
🗓 **Reviewed At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Reviewed By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}

> 🧯 Nyala api Tuan/Nona meredup, namun belum padam; silakan mencuba kembali`,
    }
}
