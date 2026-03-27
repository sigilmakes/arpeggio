import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createExtensionAPI } from '@renderer/core/extension-api'
import { ExtensionRegistry } from '@renderer/core/registry'
import { EventBus } from '@renderer/core/event-bus'
import { SettingsStore } from '@renderer/core/settings-store'

// Mock localStorage for settings tests
const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear()
    },
    configurable: true
})

const MockComponent = (() => null) as any

describe('createExtensionAPI', () => {
    let registry: ExtensionRegistry
    let eventBus: EventBus
    let settingsStore: SettingsStore

    beforeEach(() => {
        storage.clear()
        registry = new ExtensionRegistry()
        eventBus = new EventBus()
        settingsStore = new SettingsStore()
    })

    it('should expose the extension ID', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        expect(api.extensionId).toBe('my-ext')
    })

    it('should tag registrations with the extension ID', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        api.registerFileRenderer(['.md'], MockComponent)
        const renderer = registry.getFileRenderer('test.md')
        expect(renderer!.extensionId).toBe('my-ext')
    })

    it('should register sidebar panels with default order', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        api.registerSidebarPanel('test', {
            icon: MockComponent,
            label: 'Test',
            component: MockComponent,
            position: 'left'
        })
        const panel = registry.getSidebarPanel('test')
        expect(panel).toBeDefined()
        expect(panel!.order).toBe(100) // default
    })

    it('should register views with empty filePatterns by default', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        api.registerView('test', {
            displayName: 'Test',
            component: MockComponent
        })
        const view = registry.getView('test')
        expect(view).toBeDefined()
        expect(view!.filePatterns).toEqual([])
    })

    it('should wire events through the event bus', async () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        const handler = vi.fn()
        api.on('extension:loaded', handler)
        await eventBus.emit('extension:loaded', { extensionId: 'other' })
        expect(handler).toHaveBeenCalledWith({ extensionId: 'other' })
    })

    it('should allow unsubscribing from events', async () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        const handler = vi.fn()
        const sub = api.on('extension:loaded', handler)
        sub.unsubscribe()
        await eventBus.emit('extension:loaded', { extensionId: 'other' })
        expect(handler).not.toHaveBeenCalled()
    })

    it('should register commands', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        const handler = vi.fn()
        api.registerCommand('test-cmd', {
            description: 'A test command',
            handler
        })
        const cmd = registry.getCommand('test-cmd')
        expect(cmd).toBeDefined()
        expect(cmd!.extensionId).toBe('my-ext')
    })

    it('should register agent templates', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        api.registerAgentTemplate('test-agent', {
            displayName: 'Test Agent',
            adapter: 'stdio',
            detect: () => true,
            defaults: { foo: 'bar' }
        })
        const template = registry.getAgentTemplate('test-agent')
        expect(template).toBeDefined()
        expect(template!.displayName).toBe('Test Agent')
        expect(template!.extensionId).toBe('my-ext')
    })

    it('should register agent adapters', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        const factory = { create: () => ({} as any) }
        api.registerAgentAdapter('ws', factory)
        const adapter = registry.getAgentAdapter('ws')
        expect(adapter).toBeDefined()
        expect(adapter!.extensionId).toBe('my-ext')
    })

    it('should register settings tabs', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        api.registerSettingsTab('appearance', {
            label: 'Appearance',
            component: MockComponent,
            order: 1
        })
        const tab = registry.getSettingsTab('appearance')
        expect(tab).toBeDefined()
        expect(tab!.label).toBe('Appearance')
        expect(tab!.extensionId).toBe('my-ext')
    })

    it('should get and set settings scoped to extension', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus, settingsStore)
        expect(api.getSetting('theme')).toBeUndefined()
        api.setSetting('theme', 'dark')
        expect(api.getSetting<string>('theme')).toBe('dark')
    })

    it('should isolate settings between extensions', () => {
        const api1 = createExtensionAPI('ext-1', registry, eventBus, settingsStore)
        const api2 = createExtensionAPI('ext-2', registry, eventBus, settingsStore)
        api1.setSetting('key', 'value-1')
        api2.setSetting('key', 'value-2')
        expect(api1.getSetting('key')).toBe('value-1')
        expect(api2.getSetting('key')).toBe('value-2')
    })
})
