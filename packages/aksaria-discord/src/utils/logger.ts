import { timestamp } from './date'
import { ANSI_COLORS } from '../constants'

export interface Logger {
    base: (msg: string) => void
    info: (msg: string) => void
    success: (msg: string) => void
    check: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
}

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
