import { DiscordAssert } from '@utils/discord'

export class ExecuteCommandMessage extends DiscordAssert {
    static override readonly ERR = {
        ...DiscordAssert.ERR,
        NoMatchingCommand: (commandName: string) => `❌ No command matching ${commandName} was found`,
        UnexpectedExecuteCommand: '❌ Something went wrong during execute command',
    }
}
