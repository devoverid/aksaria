import type { CheckinStatusType } from '@type/checkin'
import type { TextChannel } from 'discord.js'
import { CheckinStatus } from '@commands/checkin/validators/checkin-status'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'

export class CheckinStatusClarificationButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinStatusClarificationButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_STATUS_CLARIFICATION_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Creates a thread for the grinder to discuss check-in clarification with Flamewarden when the clarification button is clicked.',
    id: CHECKIN_STATUS_CLARIFICATION_BUTTON_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedButton}`,
    async exec(client, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinStatusClarificationButtonError(Checkin.ERR.NotGuild)

            const { checkinLink } = CheckinStatus.getButtonId(interaction, interaction.customId)

            const channel = interaction.channel as TextChannel
            Checkin.assertMissPerms(interaction.client.user, channel)

            const checkin = await Checkin.getWaitingCheckin(client.prisma, 'link', checkinLink)
            Checkin.assertWaitingCheckin(checkin.status as CheckinStatusType, checkin.link!)
            Checkin.assertOwnedCheckin(checkin.user!.discord_id, interaction.user.id)
            CheckinStatus.assertHasThread(interaction.message)

            const thread = await interaction.message.startThread({
                name: CheckinStatus.MSG.ThreadName(checkin.public_id),
                reason: CheckinStatus.MSG.ThreadReason(interaction.user.tag),
                autoArchiveDuration: CheckinStatus.THREAD_ARCHIVE_DURATION,
            })

            await thread.send({ content: CheckinStatus.MSG.ThreadContent(checkin) })
            await sendReply(interaction, CheckinStatus.MSG.ThreadCreated(thread))
            await interaction.message.react(CheckinStatus.CLARIFICATION_EMOJI)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
