import process from 'node:process'
import { log } from '@core/logger'
import { wibDay } from '@core/checkin/policy'
import { prisma } from '@core/db/client'

function readOption(name: string): string | undefined {
    const index = process.argv.indexOf(name)
    if (index === -1)
        return undefined

    return process.argv[index + 1]
}

function parseChatId(raw: string | undefined): string {
    const value = raw?.trim()
    if (!value || !/^-[1-9]\d*$/.test(value))
        throw new Error('Pass --chat-id <negative decimal id> or set TELEGRAM_GROUP_ID')
    if (!Number.isSafeInteger(Number(value)) || String(Number(value)) !== value)
        throw new Error('The chat id must be a canonical negative safe integer')

    return value
}

async function main(): Promise<void> {
    const chatId = parseChatId(readOption('--chat-id') ?? process.env.TELEGRAM_GROUP_ID)
    const execute = process.argv.includes('--yes')
    const day = wibDay(new Date())

    const rows = await prisma.telegramCheckin.findMany({
        where: { chatId, day },
        select: { status: true },
    })

    const counts: Record<string, number> = { WAITING: 0, APPROVED: 0, REJECTED: 0 }
    for (const row of rows)
        counts[row.status] = (counts[row.status] ?? 0) + 1

    log.base(`Telegram chat: ${chatId}`)
    log.base(`WIB day: ${day.toISOString().slice(0, 10)}`)
    log.base(`Check-ins: ${rows.length} (WAITING ${counts.WAITING}, APPROVED ${counts.APPROVED}, REJECTED ${counts.REJECTED})`)

    if (!execute) {
        log.warn('Dry run. Re-run with --yes to delete these check-ins.')
        return
    }

    const result = await prisma.telegramCheckin.deleteMany({
        where: { chatId, day },
    })

    log.success(`Deleted ${result.count} check-in(s).`)
}

try {
    await main()
}
catch (err) {
    log.error(err instanceof Error ? err.message : 'Failed to reset check-ins')
    process.exitCode = 1
}
finally {
    await prisma.$disconnect()
}
