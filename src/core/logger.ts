/* eslint-disable no-console */
import type { Logger } from '@core/log'
import { timestamp } from './date'

const ANSI_COLORS = {
    reset: '\x1B[0m',
    red: '\x1B[31m',
    green: '\x1B[32m',
    yellow: '\x1B[33m',
    blue: '\x1B[34m',
    magenta: '\x1B[35m',
    cyan: '\x1B[36m',
    white: '\x1B[37m',
} as const

export const log: Logger = {
    base: (msg: string) =>
        console.log(`${ANSI_COLORS.white}[LOG ${timestamp()}]${ANSI_COLORS.reset} ${msg}`),

    info: (msg: string) =>
        console.log(`${ANSI_COLORS.cyan}[INFO ${timestamp()}] ✨ ${ANSI_COLORS.reset} ${msg}`),

    success: (msg: string) =>
        console.log(`${ANSI_COLORS.green}[SUCCESS ${timestamp()}] ✅ ${ANSI_COLORS.reset} ${msg}`),

    check: (msg: string) =>
        console.log(`${ANSI_COLORS.blue}[CHECKING ${timestamp()}] 🔍 ${ANSI_COLORS.reset} ${msg}`),

    warn: (msg: string) =>
        console.log(`${ANSI_COLORS.yellow}[WARNING ${timestamp()}] ⚠️ ${ANSI_COLORS.reset} ${msg}`),

    error: (msg: string) =>
        console.log(`${ANSI_COLORS.red}[ERROR ${timestamp()}] ❌ ${ANSI_COLORS.reset} ${msg}`),
}
