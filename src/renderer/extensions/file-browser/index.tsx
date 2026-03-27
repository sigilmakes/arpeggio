import type { ArpeggioAPI } from '../../core/extension-api'
import { FileBrowserPanel, FileBrowserIcon } from './FileBrowserPanel'
import { FileBrowserSettings, FileBrowserSettingsIcon } from './FileBrowserSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerSidebarPanel('file-browser', {
        icon: FileBrowserIcon,
        label: 'Files',
        component: FileBrowserPanel,
        position: 'left',
        order: 10
    })

    app.registerSettingsTab('file-browser', {
        label: 'Files & Links',
        icon: FileBrowserSettingsIcon,
        component: FileBrowserSettings,
        order: 5
    })

    app.registerCommand('files', {
        description: 'Open the file browser',
        handler: () => {
            console.log('[file-browser] Open file browser command')
        }
    })

    // Defaults
    if (app.getSetting('showHidden') === undefined) app.setSetting('showHidden', false)
    if (app.getSetting('excludePatterns') === undefined) {
        app.setSetting('excludePatterns', '.git,node_modules,.next,__pycache__,.DS_Store,.vscode,.idea')
    }
}
