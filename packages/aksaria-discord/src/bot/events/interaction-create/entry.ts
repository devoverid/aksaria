import type { Event } from '@events/event'
import type { Interaction } from 'discord.js'
import { ARCHFYRE_ROLE } from '@config/discord'
import { decodeSnowflakes } from '@utils/component'
import { sendReply } from '@utils/discord'
import { log } from '@utils/logger'
import { Events } from 'discord.js'
import { interactionHandlerMap, interactionHandlers } from './registry'

export default {
    name: Events.InteractionCreate,
    desc: 'Handles Discord InteractionCreate events and delegates them to registered handlers.',
    async exec(client, interaction: Interaction) {
        if ('customId' in interaction && interaction.customId) {
            const [prefix] = decodeSnowflakes(interaction.customId)

            const handler = interactionHandlerMap.get(prefix)
            if (handler) {
                try {
                    await handler.exec(client, interaction)
                    return
                }
                catch (err) {
                    await sendReply(interaction, `❓ Something weird happen... kindly contact <@&${ARCHFYRE_ROLE}> :)`)
                    log.error(`InteractionCreate handler failed ${handler.errorTag()}: ${err}`)
                }
            }
        }

        for (const handler of interactionHandlers) {
            if (handler.match && !handler.match(interaction))
                continue

            await handler.exec(client, interaction)
        }
    },
} as Event
