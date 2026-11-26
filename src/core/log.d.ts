export interface Logger {
    base: (message: string) => void
    info: (message: string) => void
    success: (message: string) => void
    check: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
}
