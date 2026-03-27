import type { ArpeggioAPI } from '../../core/extension-api'
import { FileBrowserPanel, FileBrowserIcon } from './FileBrowserPanel'

export default function activate(app: ArpeggioAPI): void {
    app.registerSidebarPanel('file-browser', {
        icon: FileBrowserIcon,
        label: 'Files',
        component: FileBrowserPanel,
        position: 'left',
        order: 10
    })

    app.registerCommand('files', {
        description: 'Open the file browser',
        handler: () => {
            console.log('[file-browser] Open file browser command')
        }
    })
}
