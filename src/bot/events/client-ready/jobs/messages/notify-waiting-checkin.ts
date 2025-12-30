import type { Checkin } from '@type/checkin'
import { FLAMEWARDEN_ROLE, GRINDER_ROLE } from '@config/discord'
import { getParsedNow } from '@utils/date'
import { DiscordAssert } from '@utils/discord'

export class NotifyWaitingCheckinMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedNotifyWaitingCheckin: '❌ Something went wrong while notifying waiting check-in',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        JobRunning: '[JOB] Running notify waiting checkin...',
        JobSuccess: '[JOB] Notify waiting checkin finished successfully',
        Opening: (guildName: string) => `
Wahai para <@&${FLAMEWARDEN_ROLE}>,
tatkala malam kian mendekat dan waktu hampir beralih hari, ${guildName} mencatat bahwa masih terdapat percikan api yang belum ditakar.
**📜 Laporan Status Api**
Beberapa *check-in* para <@&${GRINDER_ROLE}> masih berada dalam keadaan *WAITING* dan belum memperoleh keputusan hingga saat ini.
**⏳ Waktu Genting**
Apabila nyala tersebut tidak ditinjau sebelum 23:59 WIB,
maka rangkaian api para <@&${GRINDER_ROLE}> terkait berisiko gugur pada pergantian hari.
**⚔️ Tugas Penjagaan**
Demi menjaga keadilan perjalanan dan kesinambungan disiplin,
dimohon para <@&${FLAMEWARDEN_ROLE}> berkenan:
Ⅰ. Meninjau *check-in* yang masih tertunda,
Ⅱ. Menetapkan keputusan dengan bijaksana,
Ⅲ. Atau memberi arahan seperlunya sebelum waktu berganti.
        `,
        List: (checkin: Checkin) => `
- 🔥 <@${checkin.user!.discord_id}> pada [${getParsedNow(checkin.created_at)}](${checkin.link})
        `,
        Closing: `
Apabila hingga pergantian hari *check-in* di atas belum ditinjau, maka rangkaian nyala para <@&${GRINDER_ROLE}> terkait berisiko terputus oleh hukum waktu.

Kami mohon kebijaksanaan dan perhatian para <@&${FLAMEWARDEN_ROLE}>,
agar setiap api dinilai dengan adil sebelum malam berganti.

> *"Api bukan sekadar menyala; ia dijaga agar tak padam oleh kelalaian."*
        `,
    }
}
