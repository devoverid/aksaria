import type { Checkin } from './checkin'
import type { CheckinStreak } from './checkin-streak'

export interface User {
    id: number
    discord_id: string
    created_at: Date
    updated_at?: Date | null

    checkin_streaks?: CheckinStreak[]
    checkins?: Checkin[]
}
