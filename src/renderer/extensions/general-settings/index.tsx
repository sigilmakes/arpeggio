import type { ArpeggioAPI } from '../../core/extension-api'
import { GeneralSettings, GeneralSettingsIcon } from './GeneralSettings'

export default function activate(app: ArpeggioAPI): void {
    app.registerSettingsTab('general', {
        label: 'General',
        icon: GeneralSettingsIcon,
        component: GeneralSettings,
        order: -100  // Always first
    })

    // Defaults
    if (app.getSetting('restoreLastWorkspace') === undefined) app.setSetting('restoreLastWorkspace', true)
    if (app.getSetting('confirmDelete') === undefined) app.setSetting('confirmDelete', true)
}
