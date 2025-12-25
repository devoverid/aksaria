export function parseHexColor(input?: string | null): number | undefined {
    if (!input)
        return undefined

    const color = input.trim()
    if (/^#?[0-9a-f]{6}$/i.test(color)) {
        const hex = color.startsWith('#') ? color.slice(1) : color
        return Number.parseInt(hex, 16)
    }

    if (/^\d+$/.test(color))
        return Number(color)

    return undefined
}
