/**
 * Date utilities for Aksaria
 * Note: Uses UTC+7 (WIB - Western Indonesian Time) as the base timezone
 */

const TIMEZONE_OFFSET_HOURS = 7

/**
 * Get the current date/time adjusted to the configured timezone
 */
export function getNow(date: Date = new Date()): Date {
    return new Date(date.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)
}

/**
 * Get a formatted date string (DD/MM/YYYY, HH.MM.SS)
 */
export function getParsedNow(now: Date = getNow()): string {
    const day = String(now.getUTCDate()).padStart(2, '0')
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const year = now.getUTCFullYear()
    const hours = String(now.getUTCHours()).padStart(2, '0')
    const minutes = String(now.getUTCMinutes()).padStart(2, '0')
    const seconds = String(now.getUTCSeconds()).padStart(2, '0')

    return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`
}

/**
 * Check if a date is today (in the configured timezone)
 */
export function isDateToday(date: Date): boolean {
    const today = getNow()
    const newDate = getNow(date)

    return newDate.getUTCFullYear() === today.getUTCFullYear()
        && newDate.getUTCMonth() + 1 === today.getUTCMonth() + 1
        && newDate.getUTCDate() === today.getUTCDate()
}

/**
 * Check if a date is yesterday (in the configured timezone)
 */
export function isDateYesterday(date: Date): boolean {
    const today = getNow()
    const newDate = getNow(date)
    const yesterday = getNow(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)

    return (
        newDate.getUTCFullYear() === yesterday.getUTCFullYear()
        && newDate.getUTCMonth() === yesterday.getUTCMonth()
        && newDate.getUTCDate() === yesterday.getUTCDate()
    )
}

/**
 * Get an ISO timestamp string
 */
export function timestamp(): string {
    return getNow().toISOString()
}

/**
 * Check if a streak is continuing (last date was today or yesterday)
 */
export function isStreakContinuing(lastDate: Date): boolean {
    return isDateToday(lastDate) || isDateYesterday(lastDate)
}
