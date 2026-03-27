import type { ArpeggioAPI } from '../../core/extension-api'
import { CoreExtensionsSettings, CoreExtensionsIcon } from './CoreExtensionsSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerSettingsTab('core-extensions', {
        label: 'Core extensions',
        icon: CoreExtensionsIcon,
        component: CoreExtensionsSettings,
        order: -50  // After General, before individual extension settings
    })
}
