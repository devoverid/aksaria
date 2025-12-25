// Re-export date utilities from aksaria-core for backward compatibility
// Note: In bun runtime, 'aksaria-core' resolves through workspace linking
// For TypeScript checking, we inline the implementations

const TIMEZONE_OFFSET_HOURS = 7

export function getNow(date: Date = new Date()): Date {
    return new Date(date.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)
}

export function getParsedNow(now: Date = getNow()): string {
    const day = String(now.getUTCDate()).padStart(2, '0')
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const year = now.getUTCFullYear()
    const hours = String(now.getUTCHours()).padStart(2, '0')
    const minutes = String(now.getUTCMinutes()).padStart(2, '0')
    const seconds = String(now.getUTCSeconds()).padStart(2, '0')

    return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`
}

export function isDateToday(date: Date): boolean {
    const today = getNow()
    const newDate = getNow(date)

    return newDate.getUTCFullYear() === today.getUTCFullYear()
        && newDate.getUTCMonth() + 1 === today.getUTCMonth() + 1
        && newDate.getUTCDate() === today.getUTCDate()
}

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

export function timestamp(): string {
    return getNow().toISOString()
}

export function isStreakContinuing(lastDate: Date): boolean {
    return isDateToday(lastDate) || isDateYesterday(lastDate)
}
