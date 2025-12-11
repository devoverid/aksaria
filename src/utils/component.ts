import type { Checkin } from '@type/checkin'
import type { DiscordCustomIdMetadata } from '@type/discord-component'
import type { EmbedFooterOptions } from 'discord.js'
import { ALPHABETS, CUSTOM_ID_SEPARATOR, SNOWFLAKE_MARKER } from '@constants'
import { EmbedBuilder, LabelBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'
import { parseHexColor } from './color'
import { getNow, getParsedNow } from './date'
import { getModuleName } from './io'
import { DUMMY } from './placeholder'

const isOnlyDigitSnowflake = (id: string): boolean => /^\d+$/.test(id)

const trimSnowflakeMarker = (chars: string): string => chars.split(SNOWFLAKE_MARKER.toLowerCase()).pop()!

export function generateCustomId(rootName: string, file: string): string {
    return getModuleName(rootName, file)
        .split('/')
        .filter(Boolean)
        .map(item =>
            item
                .split('-')
                .map(word => word[0]?.toUpperCase() ?? '')
                .join(''),
        )
        .join('-')
}

export const getCustomId = (obj: DiscordCustomIdMetadata) => Object.values(obj).join(CUSTOM_ID_SEPARATOR)

export const encodeSnowflake = (numbers: string): string => `${SNOWFLAKE_MARKER}${BigInt(numbers).toString(36)}`

export function decodeSnowflakes(customId: string): string[] {
    return customId
        .split(CUSTOM_ID_SEPARATOR)
        .map((item: string): string => {
            const text = item.toLowerCase()
            if (!item.includes(SNOWFLAKE_MARKER))
                return item

            const id = decodeSnowflake(text)
            const encodedText = encodeSnowflake(id).toLocaleLowerCase()
            if (isOnlyDigitSnowflake(id) && encodedText === text)
                return id

            return item
        })
}

export function decodeSnowflake(data: string): string {
    const chars = trimSnowflakeMarker(data)

    let result = 0n
    for (const char of chars) {
        result = result * 36n + BigInt(ALPHABETS.indexOf(char))
    }

    return result.toString()
}

export function parseMessageLink(link: string) {
    const regex = /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
    const match = link.match(regex)

    if (!match)
        return null

    const [, guildId, channelId, messageId] = match
    return { guildId, channelId, messageId }
}

export const getTempToken = () => Math.random().toString(36).slice(2, 8)

export const tempStore = new Map<string, any>()

export function createEmbed(
    title?: string | null | undefined,
    desc?: string | null | undefined,
    color?: string | null,
    footer?: EmbedFooterOptions | null | undefined,
    date: boolean = true,
): EmbedBuilder {
    const embed = new EmbedBuilder()

    const parsedColor = parseHexColor(color)

    if (title)
        embed.setTitle(title)
    if (desc)
        embed.setDescription(desc)
    if (parsedColor)
        embed.setColor(parsedColor)
    if (date)
        embed.setTimestamp(new Date())
    if (footer)
        embed.setFooter(footer)

    return embed
}

export function createCheckinReviewModal(customId: string, checkin: Checkin, setStatusLabel: boolean = true) {
    const statusLabel = new LabelBuilder()
        .setLabel('Review Status')
        .setDescription('Setujui atau tolak check-in ini')
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('status')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('❌ Reject').setValue('REJECTED').setDefault(true),
                    new StringSelectMenuOptionBuilder().setLabel('🔥 Approve').setValue('APPROVED'),
                ),
        )

    const noteLabel = new LabelBuilder()
        .setLabel('Review Note')
        .setDescription('Berikan pendapat kamu')
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId('comment')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true),
        )

    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Review Check-in')

    if (setStatusLabel) {
        modal.addLabelComponents(statusLabel)
    }

    modal.addLabelComponents(noteLabel)
    modal
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`
# Informasi Grinder
🆔 **Check-In ID**:
\`\`\`bash
${checkin.public_id}
\`\`\`
🌟 **Grinder**: <@${checkin.user!.discord_id}>
🗓 **Submitted At**: ${getParsedNow(getNow(checkin.created_at))}
🔥 **Current Streak**: ${checkin.checkin_streak!.streak} day(s)
## Notulen Grinder
${checkin.description}
✰⋆｡:ﾟ･*☽:ﾟ･⋆｡✰⋆｡:ﾟ`))
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(DUMMY.MARKDOWN))

    return modal
}
