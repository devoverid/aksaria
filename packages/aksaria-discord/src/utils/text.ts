export function formatList(items: string[]): string {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    
    const lastItem = items.pop()
    return `${items.join(', ')}, and ${lastItem}`
}
