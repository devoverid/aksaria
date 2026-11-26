import type { TelegramDeps } from './deps'
import type { ChatMemberApi } from './auth'
import type { Bot } from 'grammy'
import type { ScheduledTask } from 'node-cron'
import { log } from '@core/logger'
import { addDays, wibDay } from '@core/checkin/policy'
import { claimLossNotices, countTodayWaiting, getParticipant } from '@core/checkin/group-ledger'
import { fetchChatMember, isGroupMember } from './auth'
import { panel } from './format'
import cron from 'node-cron'

export interface TelegramJobsApi extends ChatMemberApi {
    sendMessage: (chatId: number | string, text: string, other?: { parse_mode?: 'HTML' }) => Promise<unknown>
}

const tasks = new Set<ScheduledTask>()
const inFlight = new Set<Promise<void>>()
let stopping = false

export async function runReviewerReminder(api: TelegramJobsApi, deps: TelegramDeps, now: Date): Promise<number> {
    const count = await countTodayWaiting(deps.prisma, deps.chatId, wibDay(now))
    if (!count)
        return 0

    const noun = count === 1 ? 'check-in needs' : 'check-ins need'
    await api.sendMessage(
        Number(deps.chatId),
        panel('⚡ Review needed', [
            `${count} ${noun} a verdict!`,
            'Peers, hit /checkin_review in DM.',
        ]),
        { parse_mode: 'HTML' },
    )

    return count
}

export async function runLossNotices(api: TelegramJobsApi, deps: TelegramDeps, now: Date): Promise<string[]> {
    const today = wibDay(now)
    const claimed = await claimLossNotices(deps.prisma, deps.chatId, today)

    for (const userId of claimed) {
        const participant = await getParticipant(deps.prisma, deps.chatId, userId)
        if (!participant?.dmStartedAt)
            continue

        const member = await fetchChatMember(api, deps.chatId, userId)
        if (!isGroupMember(member))
            continue

        try {
            await api.sendMessage(
                Number(userId),
                panel('💔 Streak broken', [
                    `Date: ${addDays(today, -1).toISOString().slice(0, 10)}`,
                    'No approved check-in yesterday — bounce back with /checkin! 🔥',
                ]),
                { parse_mode: 'HTML' },
            )
        }
        catch {
            // The notice is claimed for the day; a permanent delivery error is not retried.
        }
    }

    return claimed
}

function schedule(expression: string, run: () => Promise<void>): void {
    if (stopping)
        return

    const task = cron.schedule(expression, () => {
        if (stopping)
            return

        const job = run()
            .catch((err) => {
                log.error(`Telegram scheduled job failed: ${err instanceof Error ? err.message : 'unknown error'}`)
            })
            .finally(() => {
                inFlight.delete(job)
            })

        inFlight.add(job)
    }, {
        timezone: 'Asia/Jakarta',
        noOverlap: true,
    })

    tasks.add(task)
}

export function startTelegramJobs(bot: Bot, deps: TelegramDeps): void {
    schedule('0 22 * * *', () => runReviewerReminder(bot.api, deps, deps.now()).then(() => {}))
    schedule('0 0 * * *', () => runLossNotices(bot.api, deps, deps.now()).then(() => {}))
}

export async function stopTelegramJobs(): Promise<void> {
    stopping = true

    for (const task of tasks)
        task.stop()

    tasks.clear()

    await Promise.allSettled([...inFlight])
    inFlight.clear()
}
