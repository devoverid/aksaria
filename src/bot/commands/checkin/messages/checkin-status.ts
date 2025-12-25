import type { Checkin } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { GuildMember } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { getNow, getParsedNow } from '@utils/date'
import { DiscordAssert } from '@utils/discord'

export class CheckinStatusMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedCheckinStatus: '❌ The status for this check-in is unknown or unexpected',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        NoCheckin: (userDiscordId: string, checkinStreak: CheckinStreak | undefined) => `
Wahai Tuan/Nona <@${userDiscordId}>,
Nyala api Tuan/Nona belum dinyalakan hari ini.
🔥 **Current Streak**: ${checkinStreak?.streak ?? 0} day(s)
🔎 **Status**: Belum melakukan *check-in*
> *"Percikan hari ini belum ditorehkan. Lakukan check-in sebelum 23:59 WIB, agar api Tuan/Nona tak meredup."*
        `,
        WaitingCheckin: (userDiscordId: string, checkin: Checkin) => `
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🌟 **Grinder**: <@${userDiscordId}>
📁 **Attachment:** ${checkin.attachments?.length ? '✅' : '❌'}
🗓 **Submitted At**: ${getParsedNow(getNow(checkin.created_at))}
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🔎 **Status**: Menunggu peninjauan <@&${FLAMEWARDEN_ROLE}>
> *"Percikan telah Tuan/Nona <@${userDiscordId}> titipkan. Mohon menanti sesaat, <@&${FLAMEWARDEN_ROLE}> tengah menakar apakah [nyala tersebut](${checkin.link}) layak menjadi bagian dari perjalanan Tuan/Nona."*
        `,
        ApprovedCheckin: (userDiscordId: string, flamewarden: GuildMember, checkin: Checkin) => `
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🌟 **Grinder**: <@${userDiscordId}>
📁 **Attachment:** ${checkin.attachments?.length ? '✅' : '❌'}
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🔎 **Status**: Disetujui; api Tuan/Nona kian terang
🗓 **Approved At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Approved By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}
> *"[Nyala hari ini](${checkin.link}) diterima. Teruslah menenun aksara disiplin, satu hari demi satu hari."*
        `,
        RejectedCheckin: (userDiscordId: string, flamewarden: GuildMember, checkin: Checkin) => `
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🌟 **Grinder**: <@${userDiscordId}>
📁 **Attachment:** ${checkin.attachments?.length ? '✅' : '❌'}
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🔎 **Status**: Disetujui; api Tuan/Nona kian terang
🗓 **Reviewed At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Reviewed By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}
> *"[Api Tuan/Nona](${checkin.link}) <@${userDiscordId}> meredup hari ini, namun belum padam sepenuhnya. Perbaiki, dan nyalakan kembali percikan yang benar."*
        `,
    }
}
