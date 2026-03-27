import type { ArpeggioAPI } from '../../core/extension-api'
import { MarkdownRenderer } from './MarkdownRenderer'
import { MarkdownSettings, MarkdownSettingsIcon } from './MarkdownSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerFileRenderer(['.md', '.markdown', '.mdx'], MarkdownRenderer)

    app.registerSettingsTab('markdown', {
        label: 'Markdown',
        icon: MarkdownSettingsIcon,
        component: MarkdownSettings,
        order: 20
    })

    // Set defaults if not already configured
    if (app.getSetting('fontSize') === undefined) app.setSetting('fontSize', 16)
    if (app.getSetting('lineWidth') === undefined) app.setSetting('lineWidth', 800)
    if (app.getSetting('spellcheck') === undefined) app.setSetting('spellcheck', true)
}
