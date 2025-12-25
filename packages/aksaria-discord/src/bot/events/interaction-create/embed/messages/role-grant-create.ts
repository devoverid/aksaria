import { DiscordAssert } from '@utils/discord'

export class RoleGrantCreateMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        NotModal: '❌ Not a modal submit interaction',
        NotButton: '❌ Not a button interaction',
        UnexpectedRoleGrantCreate: '❌ Something went wrong while creating the embed role-grant message',
    }
}
