import { describe, it, expect, beforeEach } from 'vitest'
import { ExtensionRegistry } from '@renderer/core/registry'

const MockComponent = (() => null) as any

describe('ExtensionRegistry - SettingsTabs', () => {
    let registry: ExtensionRegistry

    beforeEach(() => {
        registry = new ExtensionRegistry()
    })

    it('should include settingsTabs in stats', () => {
        registry.registerSettingsTab(
            'appearance',
            { label: 'Appearance', component: MockComponent, order: 1 },
            'ext-1'
        )
        expect(registry.stats().settingsTabs).toBe(1)
    })

    it('should clear settingsTabs on clear()', () => {
        registry.registerSettingsTab(
            'appearance',
            { label: 'Appearance', component: MockComponent, order: 1 },
            'ext-1'
        )
        registry.clear()
        expect(registry.getAllSettingsTabs()).toHaveLength(0)
    })
})
