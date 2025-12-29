import type { GuildMember, ThreadChannel } from 'discord.js'
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
        GoodBye: (guildName: string, member: GuildMember) => `
# 💔 Nyala Api Tuan/Nona <@${member.id}> Telah Gugur
Tatkala hari telah berganti dan lonceng waktu menunjukkan pergantian malam, tercatat bahwa tiada *check-in* yang sah diterima pada hari yang telah berlalu. Maka, sesuai hukum ${guildName}, peran Grinder untuk saat ini harus dilepaskan. 

Api bukanlah padam karena kelemahan, melainkan karena ia tak disirami pada waktunya.

Namun jangan berduka, jalan ini selalu terbuka bagi mereka yang bersedia memulai kembali. Apabila Tuan/Nona berkehendak menyalakan api kembali, silakan kembali ke <#${IGNITE_PATH_CHANNEL}> dan bangkitlah dari awal.

*${guildName} menanti mereka yang konsisten.*
        `,
        GoodByeNotes: (thread: ThreadChannel) => `
> Apabila *check-in* Tuan/Nona masih berada dalam status menunggu peninjauan (*waiting*) dan belum memperoleh keputusan hingga mendekati pergantian hari, maka dengan ini disampaikan ketentuan berikut:
> Ⅰ. Jangan terlebih dahulu memasuki ⁠<#${IGNITE_PATH_CHANNEL}>, demi menjaga ketertiban alur peninjauan.
> Ⅱ. Pada saat pergantian hari (pukul 00:00 WIB), sistem akan secara otomatis menampilkan arsip *check-in* terakhir Tuan/Nona di kanal <#${AUDIT_FLAME_CHANNEL}>, lengkap dengan penanda bahwa rangkaian nyala telah terputus.
> Ⅲ. Bersamaan dengan pesan tersebut, sebuah *thread* klarifikasi (${thread.url}) akan tercipta secara otomatis, sebagai ruang resmi untuk peninjauan, penandaan, dan komunikasi antara Tuan/Nona dengan <@&${FLAMEWARDEN_ROLE}>.
> Ⅳ. Tuan/Nona dipersilakan menanti proses audit di dalam *thread* tersebut. Apabila diperlukan, Tuan/Nona dapat menyampaikan penjelasan tambahan atau melakukan penandaan dengan tertib, tanpa membuka *check-in* baru terlebih dahulu.
> ⏳ Waktu peninjauan dan klarifikasi dibuka maksimal 1×24 jam sejak pesan arsip *check-in* tersebut ditampilkan.
        `,
    }
}
