import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createExtensionAPI } from '@renderer/core/extension-api'
import { ExtensionRegistry } from '@renderer/core/registry'
import { EventBus } from '@renderer/core/event-bus'

const MockComponent = (() => null) as any

describe('createExtensionAPI', () => {
    let registry: ExtensionRegistry
    let eventBus: EventBus

    beforeEach(() => {
        registry = new ExtensionRegistry()
        eventBus = new EventBus()
    })

    it('should expose the extension ID', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
        expect(api.extensionId).toBe('my-ext')
    })

    it('should tag registrations with the extension ID', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
        api.registerFileRenderer(['.md'], MockComponent)
        const renderer = registry.getFileRenderer('test.md')
        expect(renderer!.extensionId).toBe('my-ext')
    })

    it('should register sidebar panels with default order', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
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
        const api = createExtensionAPI('my-ext', registry, eventBus)
        api.registerView('test', {
            displayName: 'Test',
            component: MockComponent
        })
        const view = registry.getView('test')
        expect(view).toBeDefined()
        expect(view!.filePatterns).toEqual([])
    })

    it('should wire events through the event bus', async () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
        const handler = vi.fn()
        api.on('extension:loaded', handler)
        await eventBus.emit('extension:loaded', { extensionId: 'other' })
        expect(handler).toHaveBeenCalledWith({ extensionId: 'other' })
    })

    it('should allow unsubscribing from events', async () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
        const handler = vi.fn()
        const sub = api.on('extension:loaded', handler)
        sub.unsubscribe()
        await eventBus.emit('extension:loaded', { extensionId: 'other' })
        expect(handler).not.toHaveBeenCalled()
    })

    it('should register commands', () => {
        const api = createExtensionAPI('my-ext', registry, eventBus)
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
        const api = createExtensionAPI('my-ext', registry, eventBus)
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
        const api = createExtensionAPI('my-ext', registry, eventBus)
        const factory = { create: () => ({} as any) }
        api.registerAgentAdapter('ws', factory)
        const adapter = registry.getAgentAdapter('ws')
        expect(adapter).toBeDefined()
        expect(adapter!.extensionId).toBe('my-ext')
    })
})
