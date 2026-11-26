import type { ChatMember } from 'grammy/types'

export interface ChatMemberApi {
    getChatMember: (chatId: string | number, userId: number) => Promise<ChatMember>
}

export async function fetchChatMember(api: ChatMemberApi, chatId: string, userId: string | number): Promise<ChatMember | null> {
    const numericId = typeof userId === 'number' ? userId : Number(userId)
    if (!Number.isSafeInteger(numericId))
        return null

    try {
        return await api.getChatMember(chatId, numericId)
    }
    catch {
        return null
    }
}

export function isModerator(member: ChatMember | null): boolean {
    return member?.status === 'creator' || member?.status === 'administrator'
}

export function isGroupMember(member: ChatMember | null): boolean {
    if (!member)
        return false
    if (member.status === 'creator' || member.status === 'administrator' || member.status === 'member')
        return true

    return member.status === 'restricted' && member.is_member
}

export function currentMemberTag(member: ChatMember | null): string {
    return member?.status === 'member' ? member.tag ?? '' : ''
}
