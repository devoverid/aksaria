export const PANEL_FOOTER = 'Aksaria • Where discipline meets destiny'

export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
}

export function panel(title: string, lines: readonly string[]): string {
    return [
        `<b>${title}</b>`,
        '━━━━━━━━━━━━',
        ...lines,
        '',
        `<i>${PANEL_FOOTER}</i>`,
    ].join('\n')
}
