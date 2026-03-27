import type { ArpeggioAPI } from '../../core/extension-api'
import { PdfViewer } from './PdfViewer'
import { PdfViewerSettings, PdfViewerSettingsIcon } from './PdfViewerSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerFileRenderer(['.pdf'], PdfViewer)

    app.registerSettingsTab('pdf-viewer', {
        label: 'PDF',
        icon: PdfViewerSettingsIcon,
        component: PdfViewerSettings,
        order: 35
    })

    if (app.getSetting('defaultZoom') === undefined) app.setSetting('defaultZoom', 100)
}
