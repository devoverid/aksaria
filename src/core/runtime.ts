export interface BotRuntime {
    start: () => Promise<void>
    stop: () => Promise<void>
    done: Promise<void>
}
