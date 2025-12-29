import type { Checkin } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { GuildMember, PublicThreadChannel } from 'discord.js'
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
        ThreadName: (publicId: string) => `❓ Klarifikasi Check-In #${publicId}`,
        ThreadReason: (userTag: string) => `Check-in clarification requested by ${userTag}`,
        ThreadContent: (checkin: Checkin) => `
👤 <@${checkin.user!.discord_id}> meminta klarifikasi untuk [*check-in*](${checkin.link!}) ini.
🔥 <@&${FLAMEWARDEN_ROLE}> mohon ditinjau.

Teristimewa untuk <@&${FLAMEWARDEN_ROLE}>, silakan gunakan *command* **\`/checkin-audit\`** untuk melakukan *review* terhadap *check-in*.
        `,
        ThreadCreated: (thread: PublicThreadChannel) => `
✅ Sebuah thread klarifikasi telah dibuat:

**${thread.name}**  
🔗 [Lihat Thread](${thread.url})

Silakan gunakan thread ini untuk mendiskusikan detail *check-in* bersama <@&${FLAMEWARDEN_ROLE}>.
        `,
        NoCheckin: (userDiscordId: string, checkinStreak: CheckinStreak | undefined) => `
Wahai Tuan/Nona <@${userDiscordId}>,
nyala api Tuan/Nona belum dinyalakan hari ini.
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
👀 **Approved By**: <@${flamewarden.id}>
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
🔎 **Status**: Ditolak; percikan tak cukup kuat
🗓 **Reviewed At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Reviewed By**: <@${flamewarden.id}>
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}
> *"[Api Tuan/Nona](${checkin.link}) <@${userDiscordId}> meredup hari ini, namun belum padam sepenuhnya. Perbaiki, dan nyalakan kembali percikan yang benar."*
        `,
        LastCheckin: (guildName: string, userDiscordId: string, checkin: Checkin, flamewarden?: GuildMember) => `
Wahai Tuan/Nona <@${userDiscordId}>,
tercatat bahwa rangkaian nyala api Tuan/Nona telah terputus pada pergantian hari sebelumnya.
Namun demikian, percikan terakhir masih tersimpan dalam arsip ${guildName} dan dapat ditinjau kembali.

Berikut adalah *check-in* terakhir yang pernah Tuan/Nona torehkan:
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🌟 **Grinder**: <@${userDiscordId}>
📁 **Attachment:** ${checkin.attachments?.length ? '✅' : '❌'}
🗓 **Submitted At**: ${getParsedNow(getNow(checkin.created_at))}
🔥 **Last Streak**: ${checkin.checkin_streak!.streak} day(s)
💥 **Broken Streak**: ${checkin.checkin_streak!.streak_broken_at ? '✅' : '❌'}
🔎 **Status**: ${checkin.status}
${flamewarden?.displayName
    ? `🗓 **Reviewed At**: ${getParsedNow(getNow(checkin.updated_at!))}
👀 **Reviewed By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}`
    : ''}
> *"[Percikan ini](${checkin.link}) pernah kamu titipkan pada api, namun belum sempat ditakar oleh penjaga nyala."*
        `,
    }
}
