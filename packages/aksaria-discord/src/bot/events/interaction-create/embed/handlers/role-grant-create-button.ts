import type { GuildMember, TextChannel } from 'discord.js'
import { EVENT_PATH } from '@events/index'
import { registerInteractionHandler } from '@events/interaction-create/registry'
import { generateCustomId } from '@utils/component'
import { getRole, sendReply } from '@utils/discord'
import { DiscordBaseError } from '@utils/discord/error'
import { getModuleName } from '@utils/io'
import { RoleGrantCreate } from '../validators/role-grant-create'

export class EmbedRoleGrantButtonError extends DiscordBaseError {
    constructor(message: string, options?: { cause?: unknown }) {
        super('EmbedRoleGrantButtonError', message, options)
    }
}

const moduleName = getModuleName(EVENT_PATH, __filename)
export const EMBED_ROLE_GRANT_CREATE_BUTTON_ID = `${generateCustomId(EVENT_PATH, __filename)}`

registerInteractionHandler({
    desc: 'Handles role assignment button interactions and adds a role for users.',
    id: EMBED_ROLE_GRANT_CREATE_BUTTON_ID,
    errorTag: () => `${moduleName}: ${RoleGrantCreate.ERR.UnexpectedButton}`,
    async exec(_, interaction) {
        if (!interaction.isButton())
            return

        try {
            if (!interaction.inCachedGuild())
                throw new EmbedRoleGrantButtonError(RoleGrantCreate.ERR.NotGuild)

            const channel = interaction.channel as TextChannel
            RoleGrantCreate.assertMissPerms(interaction.client.user, channel)

            const { roleId } = RoleGrantCreate.getButtonId(interaction, interaction.customId)
            const member = interaction.member as GuildMember
            const role = await getRole(interaction.guild, roleId)

            RoleGrantCreate.assertRole(role)
            RoleGrantCreate.assertMember(member)
            RoleGrantCreate.assertMemberAlreadyHasRole(member, role.id)

            await member.roles.add(role)
            await sendReply(interaction, `
                ${RoleGrantCreate.MSG.RoleGranted(role.id)}`)
        }
        catch (err: any) {
            if (err instanceof DiscordBaseError)
                await sendReply(interaction, err.message)
            else throw err
        }
    },
})
