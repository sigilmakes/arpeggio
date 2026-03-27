import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExtensionLoader } from '@renderer/core/extension-loader'
import { ExtensionRegistry } from '@renderer/core/registry'
import { EventBus } from '@renderer/core/event-bus'

const MockComponent = (() => null) as any

describe('ExtensionLoader', () => {
    let registry: ExtensionRegistry
    let eventBus: EventBus
    let loader: ExtensionLoader

    beforeEach(() => {
        registry = new ExtensionRegistry()
        eventBus = new EventBus()
        loader = new ExtensionLoader(registry, eventBus)
    })

    it('should register and load a built-in extension', async () => {
        const activate = vi.fn((app) => {
            app.registerCommand('test', { description: 'Test', handler: () => {} })
        })

        loader.registerBuiltIn('test-ext', 'Test Extension', activate)
        await loader.loadAll()

        expect(activate).toHaveBeenCalledOnce()
        expect(loader.isLoaded('test-ext')).toBe(true)
        expect(registry.getCommand('test')).toBeDefined()
    })

    it('should handle activation errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        loader.registerBuiltIn('broken', 'Broken', () => {
            throw new Error('Extension failed')
        })
        await loader.loadAll()

        const ext = loader.getExtension('broken')
        expect(ext).toBeDefined()
        expect(ext!.status).toBe('error')
        expect(ext!.error).toBe('Extension failed')

        consoleSpy.mockRestore()
    })

    it('should emit extension:loaded on success', async () => {
        const handler = vi.fn()
        eventBus.on('extension:loaded', handler)

        loader.registerBuiltIn('ext-1', 'Extension 1', () => {})
        await loader.loadAll()

        expect(handler).toHaveBeenCalledWith({ extensionId: 'ext-1' })
    })

    it('should emit extension:error on failure', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const handler = vi.fn()
        eventBus.on('extension:error', handler)

        loader.registerBuiltIn('broken', 'Broken', () => {
            throw new Error('Boom')
        })
        await loader.loadAll()

        expect(handler).toHaveBeenCalledWith({ extensionId: 'broken', error: 'Boom' })
    })

    it('should load multiple extensions', async () => {
        loader.registerBuiltIn('ext-1', 'Ext 1', (app) => {
            app.registerSidebarPanel('panel-1', {
                icon: MockComponent,
                label: 'Panel 1',
                component: MockComponent,
                position: 'left'
            })
        })
        loader.registerBuiltIn('ext-2', 'Ext 2', (app) => {
            app.registerSidebarPanel('panel-2', {
                icon: MockComponent,
                label: 'Panel 2',
                component: MockComponent,
                position: 'right'
            })
        })

        await loader.loadAll()

        expect(loader.getLoaded()).toHaveLength(2)
        expect(registry.getSidebarPanels('left')).toHaveLength(1)
        expect(registry.getSidebarPanels('right')).toHaveLength(1)
    })

    it('should list all loaded extensions with metadata', async () => {
        loader.registerBuiltIn('ext-1', 'Extension 1', () => {})
        await loader.loadAll()

        const loaded = loader.getLoaded()
        expect(loaded).toHaveLength(1)
        expect(loaded[0].manifest.id).toBe('ext-1')
        expect(loaded[0].manifest.builtIn).toBe(true)
        expect(loaded[0].status).toBe('loaded')
    })
})
