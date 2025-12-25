import type { GuildMember } from 'discord.js'
import { AUDIT_FLAME_CHANNEL, FLAMEWARDEN_ROLE, IGNITE_PATH_CHANNEL } from '@config/discord'
import { DiscordAssert } from '@utils/discord'

export class ResetGrinderRolesMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedResetGrinderRoles: '❌ Something went wrong while resetting grinder roles',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        JobRunning: '[JOB] Running daily grinder reset...',
        JobSuccess: '[JOB] Grinder daily reset finished successfully',
        RemoveGrinderRoleFrom: (member: GuildMember) => `[JOB] Removed Grinder role from ${member.user.tag}`,
        GoodBye: (member: GuildMember) => `
# 💔 Nyala Api Tuan/Nona <@${member.id}> Telah Gugur
Tatkala hari telah berganti dan lonceng waktu menunjukkan pergantian malam, tercatat bahwa tiada *check-in* yang sah diterima pada hari yang telah berlalu. Maka, sesuai hukum Aksaria, peran Grinder untuk saat ini harus dilepaskan. 

Api bukanlah padam karena kelemahan, melainkan karena ia tak disirami pada waktunya.

Namun jangan berduka, jalan ini selalu terbuka bagi mereka yang bersedia memulai kembali. Apabila Tuan/Nona berkehendak menyalakan api kembali, silakan kembali ke <#${IGNITE_PATH_CHANNEL}> dan bangkitlah dari awal.

*Aksaria menanti mereka yang konsisten.*
        `,
        GoodByeNotes: `
> Apabila *check-in* Tuan/Nona masih berada dalam status menunggu peninjauan (*waiting*) dan belum memperoleh keputusan hingga mendekati pergantian hari, maka dengan ini disampaikan ketentuan berikut:
> Ⅰ. Jangan terlebih dahulu memasuki ⁠<#${IGNITE_PATH_CHANNEL}>, demi menjaga ketertiban alur peninjauan.
> Ⅱ. Silakan menjalankan perintah **\`/checkin-status\`** pada <#${AUDIT_FLAME_CHANNEL}> untuk menampilkan status *check-in* terakhir Tuan/Nona.
> Ⅲ. Setelah pesan status tersebut muncul, berikan reaksi "❓" pada pesan tersebut.
> Ⅳ. Dari reaksi tersebut, sebuah *thread* akan tercipta secara otomatis sebagai ruang klarifikasi dan komunikasi dengan <@&${FLAMEWARDEN_ROLE}>.
> ⏳ Batas waktu penantian atas status *WAITING* adalah maksimal 1×24 jam sejak *check-in* diajukan.
        `,
    }
}
