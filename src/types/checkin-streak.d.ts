import type { Checkin } from './checkin'
import type { User } from './user'

export interface CheckinStreak {
    id: number
    user_id: number
    first_date: Date
    last_date?: Date | null
    streak: number
    is_break?: Date | null
    updated_at?: Date | null

    user?: User
    checkins?: Checkin[]
}
