import type { GuildMember } from 'discord.js'
import { CHECKIN_CHANNEL, FLAMEWARDEN_ROLE } from '@config/discord'
import { DiscordAssert } from '@utils/discord'

export class GrinderRoleMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedGrinderRole: '❌ Something went wrong while managing the grinder role',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        Greetings: (member: GuildMember): string => `
# 🔥 Seorang Grinder Baru Telah Memasuki Perkemahan!
Selamat datang, Tuan/Nona <@${member.id}>✨ 
Nyala api kamu telah dinyalakan, dan dengan itu Tuan/Nona resmi menapaki Path of Grinder.

Sebagai langkah permulaan, perkenankan kami menuntun Tuan/Nona:
Ⅰ. Kunjungilah ⁠<#${CHECKIN_CHANNEL}> untuk menorehkan grind harian pertama kamu.
Ⅱ. Tuliskan apa yang tengah Tuan/Nona tempuh hari ini, entah itu reading, coding, crafting, designing, exercise, ataupun belajar hal baru.
Ⅲ. Nantikan peninjauan dari seorang <@&${FLAMEWARDEN_ROLE}>, yang akan menilai dan mengesahkan *check-in* Tuan/Nona.
        `,
        WelcomeNotes: `
> Harap diingat dengan saksama:
> Streak Tuan/Nona hanya bermula setelah *check-in* pertama disahkan.
> Apabila hingga pukul 23:59 WIB Tuan/Nona lalai menorehkan *check-in*, maka nyala api akan meredup, dan perjalanan harus dimulai kembali dari awal.
> Selamat menempuh jalan ini.
> Biarlah disiplin menjadi percikan, dan konsistensi menjelma nyala yang tak mudah padam🔥.
        `,
    }
}
