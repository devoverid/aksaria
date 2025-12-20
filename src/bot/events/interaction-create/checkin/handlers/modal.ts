import type { Attachment, GuildMember, Message } from 'discord.js'
import { FLAMEWARDEN_ROLE } from '@config/discord'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId, tempStore } from '@utils/component'
import { sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { Checkin } from '../validators'

export class CheckinModalError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('CheckinModalError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const CHECKIN_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles modal submissions for check-in modal forms.',
    id: CHECKIN_ID,
    errorTag: () => `${moduleName}: ${Checkin.ERR.UnexpectedModal}`,
    async exec(client, interaction) {
        if (!interaction.isModalSubmit())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new CheckinModalError(Checkin.ERR.NotGuild)

            const { tempToken } = Checkin.getModalId(interaction, interaction.customId)
            const attachments = tempStore.get(tempToken) as Attachment[]
            Checkin.delTempItem(attachments, tempToken)

            const todo = interaction.fields.getTextInputValue('todo')
            const userDiscordId: string = interaction.user.id
            const member = interaction.member as GuildMember
            const user = await Checkin.getOrCreateUser(client.prisma, userDiscordId)

            Checkin.assertMember(member)
            Checkin.assertMemberGrindRoles(member)
            Checkin.assertCheckinToday(user)

            const {
                checkinStreak,
                checkin,
                prevCheckin,
            } = await Checkin.validateCheckinStreak(client.prisma, user.id, user.checkin_streaks?.[0], todo)

            const buttons = Checkin.generateButtons(interaction.guildId, checkin.id.toString())

            const msg = await sendReply(
                interaction,
                Checkin.MSG.CheckinSuccess(
                    member,
                    attachments,
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
            ) as Message

            if (msg.attachments.size > 0) {
                await Checkin.createAttachments(client.prisma, checkin, Array.from(msg.attachments.values()))
            }

            const updatedCheckin = await Checkin.updateCheckinMsgLink(interaction, client.prisma, checkin, msg)
            await Checkin.sendSuccessCheckinToMember(member, updatedCheckin)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
