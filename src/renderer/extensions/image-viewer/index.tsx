import type { ArpeggioAPI } from '../../core/extension-api'
import { ImageViewer } from './ImageViewer'
import { ImageViewerSettings, ImageViewerSettingsIcon } from './ImageViewerSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerFileRenderer(
        ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'],
        ImageViewer
    )

    app.registerSettingsTab('image-viewer', {
        label: 'Images',
        icon: ImageViewerSettingsIcon,
        component: ImageViewerSettings,
        order: 30
    })

    if (app.getSetting('background') === undefined) app.setSetting('background', 'checkered')
    if (app.getSetting('fitMode') === undefined) app.setSetting('fitMode', 'contain')
}
