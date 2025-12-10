import type { Event } from '@events/event'
import type { Attachment, Client, GuildMember, Interaction } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { generateCustomId, tempStore } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { Checkin } from '../validators/checkin'

export class CheckinModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinModalError', message, options)
    }
}

export const CHECKIN_ID = generateCustomId(EVENT_PATH, __filename)

export default {
    name: Events.InteractionCreate,
    desc: 'Handles modal submissions for check-in modal forms.',
    async exec(client: Client, interaction: Interaction) {
        if (!interaction.isModalSubmit())
            return

        const isValidComponent = Checkin.assertComponentId(interaction.customId, CHECKIN_ID)
        if (!isValidComponent)
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinModalError(Checkin.ERR.NotGuild)

            const { tempToken } = Checkin.getModalId(interaction, interaction.customId)
            const attachments = tempStore.get(tempToken) as Attachment[]
            Checkin.delTempItem(attachments, tempToken)

            const todo = interaction.fields.getTextInputValue('todo')
            const discordUserId: string = interaction.user.id
            const member = interaction.member as GuildMember
            const user = await Checkin.getOrCreateUser(client.prisma, discordUserId)

            Checkin.assertMember(member)
            Checkin.assertMemberGrindRoles(member)
            Checkin.assertCheckinToday(user)

            const {
                checkinStreak,
                checkin,
                prevCheckin,
            } = await Checkin.validateCheckinStreak(client.prisma, user.id, user.checkin_streaks?.[0], todo, attachments)

            const buttons = Checkin.generateButtons(interaction.guildId, checkin.id.toString())

            const msgLink = await sendReply(
                interaction,
                Checkin.MSG.CheckinSuccess(
                    member,
                    checkinStreak.streak,
                    todo,
                    prevCheckin,
                ),
                false,
                {
                    files: attachments.length ? attachments : undefined,
                    components: [buttons],
                    allowedMentions: { users: [member.id], roles: [FLAMEWARDEN_ROLE] },
                },
                true,
            )

            const updatedCheckin = await Checkin.updateCheckinMsgLink(client.prisma, checkin, msgLink)
            await Checkin.sendSuccessCheckinToMember(member, updatedCheckin)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else log.error(`Failed to handle ${CHECKIN_ID}: ${Checkin.ERR.UnexpectedModal}: ${err}`)
        }
    },
} as Event
