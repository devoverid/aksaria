import type { ScheduledTask } from 'node-cron'
import { log } from '@core/logger'
import cron from 'node-cron'

const tasks = new Set<ScheduledTask>()
const inFlight = new Set<Promise<void>>()
let stopping = false

export function scheduleDiscordJob(expression: string, run: () => Promise<void>): void {
    if (stopping)
        return

    const task = cron.schedule(expression, () => {
        if (stopping)
            return

        const job = run()
            .catch((err) => {
                log.error(`Discord scheduled job failed: ${err instanceof Error ? err.message : String(err)}`)
            })
            .finally(() => {
                inFlight.delete(job)
            })

        inFlight.add(job)
    })

    tasks.add(task)
}

export async function stopDiscordJobs(): Promise<void> {
    stopping = true

    for (const task of tasks)
        task.stop()

    tasks.clear()

    await Promise.allSettled([...inFlight])
    inFlight.clear()
}
