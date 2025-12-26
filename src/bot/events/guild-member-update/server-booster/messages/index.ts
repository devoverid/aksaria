import type { GuildMember } from 'discord.js'
import { BEARER_LOUNGE_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { createEmbed } from '@utils/component'
import { DiscordAssert } from '@utils/discord'
import { DUMMY } from '@utils/placeholder'

export class ServerBoosterMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        UnexpectedServerBooster: '❌ Something went wrong while managing the server booster',
    }

    static override readonly MSG = {
        ...DiscordAssert.MSG,
        SpecialThanks: `# ❤️‍🔥 Sebuah Nyala Telah Diperkuat`,
        Really: `
Api tidak selalu membesar karena banyak kayu,
kadang karena satu jiwa yang rela memberi nyala!`,
        ItMeansALot: (guildName: string, userDiscordId: string, boostCount: number) => `
Tuan/Nona <@${userDiscordId}> telah mempersembahkan aura mereka untuk menguatkan nyala ${guildName} beserta para <@&${GRINDER_ROLE}>🔥!

**✨ Maklumat Anugerah**
- Jumlah *Server Boost* ${guildName} kini bertambah menjadi **\`${boostCount}\`**.
- Tuan/Nona resmi diakui sebagai *Bearer of the Flame*.
- Gerbang khusus ⁠<#${BEARER_LOUNGE_CHANNEL}> kini terbuka bagi Tuan/Nona; sebuah ruang kehormatan untuk para penjaga nyala.

Kami sampaikan terima kasih setinggi-tingginya.
Semoga nyala kebaikan ini kembali pada Tuan/Nona
dalam wujud disiplin, keberkahan, dan pertumbuhan.
        `,
    }

    static sayDeeplyThanksTo(member: GuildMember) {
        return createEmbed(
            this.MSG.Really,
            this.MSG.ItMeansALot(member.guild.name, member.id, member.guild.premiumSubscriptionCount ?? 0),
            DUMMY.COLOR,
            { text: DUMMY.FOOTER(member.guild.name) },
            {
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL(),
            },
            member.user.displayAvatarURL({ size: 512 }),
        )
    }
}
