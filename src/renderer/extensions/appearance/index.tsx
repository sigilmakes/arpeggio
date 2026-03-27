import type { ArpeggioAPI } from '../../core/extension-api'
import { AppearanceSettings, AppearanceIcon } from './AppearanceSettings'

export type ThemeMode = 'light' | 'dark' | 'system'

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
}

function applyTheme(resolved: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', resolved)
}

export default function activate(app: ArpeggioAPI): void {
    // Read stored preference or default to system
    const mode = app.getSetting<ThemeMode>('mode') ?? 'system'
    applyTheme(resolveTheme(mode))

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const systemListener = () => {
        const current = app.getSetting<ThemeMode>('mode') ?? 'system'
        if (current === 'system') {
            applyTheme(resolveTheme('system'))
        }
    }
    mediaQuery.addEventListener('change', systemListener)

    // Register settings tab
    app.registerSettingsTab('appearance', {
        label: 'Appearance',
        icon: AppearanceIcon,
        component: AppearanceSettings,
        order: -80
    })

    // Register command to open settings
    app.registerCommand('toggle-theme', {
        description: 'Cycle through light / dark / system theme',
        handler: () => {
            const current = app.getSetting<ThemeMode>('mode') ?? 'system'
            const next: ThemeMode =
                current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
            app.setSetting('mode', next)
            applyTheme(resolveTheme(next))
        }
    })
}
