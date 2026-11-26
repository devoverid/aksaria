export const PANEL_FOOTER = 'Aksaria • Where discipline meets destiny'

const PANEL_SEPARATOR = '━━━━━━━━━━━━'

export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
}

export function plainPanel(title: string, lines: readonly string[]): string {
    return [
        title,
        PANEL_SEPARATOR,
        ...lines,
        '',
        PANEL_FOOTER,
    ].join('\n')
}

export function panel(title: string, lines: readonly string[]): string {
    return [
        `<b>${title}</b>`,
        PANEL_SEPARATOR,
        ...lines,
        '',
        `<i>${PANEL_FOOTER}</i>`,
    ].join('\n')
}
