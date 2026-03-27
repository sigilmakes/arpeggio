import type { ArpeggioAPI } from '../../core/extension-api'
import { CodeEditor } from './CodeEditor'
import { CodeEditorSettings, CodeEditorSettingsIcon } from './CodeEditorSettings'

const CODE_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.jsonc',
    '.css', '.scss', '.less',
    '.html', '.htm', '.xml', '.svg',
    '.py', '.pyw',
    '.rs',
    '.go',
    '.java', '.kt', '.kts',
    '.c', '.h', '.cpp', '.hpp', '.cc',
    '.cs',
    '.rb',
    '.php',
    '.sh', '.bash', '.zsh', '.fish',
    '.yaml', '.yml',
    '.toml',
    '.ini', '.cfg',
    '.sql',
    '.lua',
    '.zig',
    '.swift',
    '.r',
    '.dockerfile',
    '.graphql', '.gql',
]

export default function activate(app: ArpeggioAPI): void {
    app.registerFileRenderer(CODE_EXTENSIONS, CodeEditor)

    app.registerSettingsTab('code-editor', {
        label: 'Editor',
        icon: CodeEditorSettingsIcon,
        component: CodeEditorSettings,
        order: 10
    })

    // Defaults
    if (app.getSetting('fontSize') === undefined) app.setSetting('fontSize', 14)
    if (app.getSetting('tabSize') === undefined) app.setSetting('tabSize', 4)
    if (app.getSetting('wordWrap') === undefined) app.setSetting('wordWrap', true)
    if (app.getSetting('lineNumbers') === undefined) app.setSetting('lineNumbers', true)
    if (app.getSetting('minimap') === undefined) app.setSetting('minimap', false)
    if (app.getSetting('bracketColors') === undefined) app.setSetting('bracketColors', true)
}
