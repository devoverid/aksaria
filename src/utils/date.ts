export function getNow(date: Date = new Date()) {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000)
}

export function getParsedNow() {
    const now = getNow()
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

export const timestamp = (): string => getNow().toISOString()
