import type { Event } from '@discord/events/event'
import type { Interaction } from 'discord.js'
import { ARCHFYRE_ROLE } from '@discord/config/discord'
import { decodeSnowflakes } from '@discord/utils/component'
import { sendReply } from '@discord/utils/discord'
import { log } from '@core/logger'
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
