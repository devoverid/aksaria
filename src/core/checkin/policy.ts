import { getNow } from '@core/date'

export type CheckinStatusType = 'WAITING' | 'APPROVED' | 'REJECTED'

export const STREAK_MILESTONES = [1, 7, 30, 90, 180, 270, 364] as const

const DAY_MS = 86_400_000

export function wibDay(at: Date): Date {
    const shifted = getNow(at)

    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
}

export function dayKey(day: Date): number {
    return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
}

export function addDays(day: Date, amount: number): Date {
    return new Date(dayKey(day) + amount * DAY_MS)
}

export function countConsecutiveDays(approvedDays: readonly Date[], endDay: Date): number {
    const end = dayKey(endDay)
    const approved = new Set(
        approvedDays
            .map(dayKey)
            .filter(key => key <= end),
    )

    if (!approved.has(end))
        return 0

    let count = 0
    for (let key = end; approved.has(key); key -= DAY_MS)
        count++

    return count
}
