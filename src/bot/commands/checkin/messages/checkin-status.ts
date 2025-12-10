import type { Checkin } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { GuildMember } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { getParsedNow } from '@utils/date'
import { DiscordAssert } from '@utils/discord'

export class CheckinStatusMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedCheckinStatus: '❌ The status for this check-in is unknown or unexpected',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        NoCheckin: (member: GuildMember, checkinStreak: CheckinStreak | undefined) => `
Wahai Tuan/Nona <@${member.id}>,
Nyala api Tuan/Nona belum dinyalakan hari ini.
🗓 **Date**: ${getParsedNow()}
🔥 **Current Streak**: ${checkinStreak?.streak ?? 0} day(s)
🔎 **Status**: Belum melakukan check-in
> *“Percikan hari ini belum ditorehkan. Lakukan check-in sebelum 23:59 WIB, agar api Tuan/Nona tak meredup.”*
        `,
        WaitingCheckin: (member: GuildMember, checkin: Checkin) => `
🆔 **Check-In ID**: [${checkin.public_id}](${checkin.link})
🗓 **Submitted At**: ${getParsedNow(checkin.created_at)}
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🔎 **Status**: Menunggu peninjauan <@&${FLAMEWARDEN_ROLE}>
> *“Percikan telah Tuan/Nona <@${member.id}> titipkan. Mohon menanti sesaat, <@&${FLAMEWARDEN_ROLE}> tengah menakar apakah nyala tersebut layak menjadi bagian dari perjalanan Tuan/Nona.”*
        `,
        ApprovedCheckin: (flamewarden: GuildMember, checkin: Checkin) => `
🆔 **Check-In ID**: [${checkin.public_id}](${checkin.link})
🔎 **Status**: Disetujui; api Tuan/Nona kian terang
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🗓 **Approved At**: ${getParsedNow(checkin.updated_at!)}
👀 **Approved By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}
> *“Nyala hari ini diterima. Teruslah menenun aksara disiplin, satu hari demi satu hari.”*
        `,
        RejectedCheckin: (member: GuildMember, flamewarden: GuildMember, checkin: Checkin) => `
🆔 **Check-In ID**: [${checkin.public_id}](${checkin.link})
🔎 **Status**: Disetujui; api Tuan/Nona kian terang
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
🗓 **Reviewed At**: ${getParsedNow(checkin.updated_at!)}
👀 **Reviewed By**: ${flamewarden.displayName} (@${flamewarden.user.username})
✍🏻 **${flamewarden.displayName}'(s) Comment**: ${checkin.comment ?? '-'}
> *"Api Tuan/Nona <@${member.id}> meredup hari ini, namun belum padam sepenuhnya. Perbaiki, dan nyalakan kembali percikan yang benar."*
        `,
    }
}
