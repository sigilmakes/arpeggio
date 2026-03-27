import { describe, it, expect, beforeEach } from 'vitest'
import { ExtensionRegistry } from '@renderer/core/registry'

// Minimal mock component
const MockComponent = (() => null) as any

describe('ExtensionRegistry', () => {
    let registry: ExtensionRegistry

    beforeEach(() => {
        registry = new ExtensionRegistry()
    })

    // ── File Renderers ─────────────────────────────────────

    describe('FileRenderers', () => {
        it('should register and retrieve a file renderer by extension', () => {
            registry.registerFileRenderer(['.md', '.markdown'], MockComponent, 'ext-1')
            const renderer = registry.getFileRenderer('README.md')
            expect(renderer).toBeDefined()
            expect(renderer!.extensionId).toBe('ext-1')
        })

        it('should return undefined for unregistered extensions', () => {
            expect(registry.getFileRenderer('file.xyz')).toBeUndefined()
        })

        it('should return all registered renderers', () => {
            registry.registerFileRenderer(['.md'], MockComponent, 'ext-1')
            registry.registerFileRenderer(['.ts'], MockComponent, 'ext-2')
            expect(registry.getAllFileRenderers()).toHaveLength(2)
        })
    })

    // ── Agent Adapters ─────────────────────────────────────

    describe('AgentAdapters', () => {
        const mockFactory = { create: () => ({} as any) }

        it('should register and retrieve an adapter', () => {
            registry.registerAgentAdapter('acp', mockFactory, 'ext-1')
            const adapter = registry.getAgentAdapter('acp')
            expect(adapter).toBeDefined()
            expect(adapter!.protocol).toBe('acp')
        })

        it('should return undefined for unregistered protocol', () => {
            expect(registry.getAgentAdapter('unknown')).toBeUndefined()
        })
    })

    // ── Agent Templates ────────────────────────────────────

    describe('AgentTemplates', () => {
        it('should register and retrieve a template', () => {
            registry.registerAgentTemplate(
                'claude-code',
                {
                    displayName: 'Claude Code',
                    adapter: 'acp',
                    detect: () => true,
                    defaults: {}
                },
                'ext-1'
            )
            const template = registry.getAgentTemplate('claude-code')
            expect(template).toBeDefined()
            expect(template!.displayName).toBe('Claude Code')
        })
    })

    // ── Sidebar Panels ─────────────────────────────────────

    describe('SidebarPanels', () => {
        it('should register and filter by position', () => {
            registry.registerSidebarPanel(
                'files',
                { icon: MockComponent, label: 'Files', component: MockComponent, position: 'left', order: 10 },
                'ext-1'
            )
            registry.registerSidebarPanel(
                'agents',
                { icon: MockComponent, label: 'Agents', component: MockComponent, position: 'right', order: 10 },
                'ext-2'
            )

            expect(registry.getSidebarPanels('left')).toHaveLength(1)
            expect(registry.getSidebarPanels('right')).toHaveLength(1)
            expect(registry.getSidebarPanels('left')[0].id).toBe('files')
        })

        it('should sort panels by order', () => {
            registry.registerSidebarPanel(
                'b',
                { icon: MockComponent, label: 'B', component: MockComponent, position: 'left', order: 20 },
                'ext-1'
            )
            registry.registerSidebarPanel(
                'a',
                { icon: MockComponent, label: 'A', component: MockComponent, position: 'left', order: 10 },
                'ext-2'
            )

            const panels = registry.getSidebarPanels('left')
            expect(panels[0].id).toBe('a')
            expect(panels[1].id).toBe('b')
        })
    })

    // ── Views ──────────────────────────────────────────────

    describe('Views', () => {
        it('should register and retrieve by ID', () => {
            registry.registerView(
                'kanban',
                { displayName: 'Kanban', component: MockComponent, filePatterns: ['*.kanban.md'] },
                'ext-1'
            )
            expect(registry.getView('kanban')).toBeDefined()
        })

        it('should match views to file patterns', () => {
            registry.registerView(
                'kanban',
                { displayName: 'Kanban', component: MockComponent, filePatterns: ['*.kanban.md'] },
                'ext-1'
            )
            const view = registry.getViewForFile('/path/to/board.kanban.md')
            expect(view).toBeDefined()
            expect(view!.id).toBe('kanban')
        })

        it('should return undefined for non-matching files', () => {
            registry.registerView(
                'kanban',
                { displayName: 'Kanban', component: MockComponent, filePatterns: ['*.kanban.md'] },
                'ext-1'
            )
            expect(registry.getViewForFile('readme.md')).toBeUndefined()
        })
    })

    // ── Commands ───────────────────────────────────────────

    describe('Commands', () => {
        it('should register and retrieve commands', () => {
            registry.registerCommand(
                'test',
                { description: 'Test command', handler: () => {} },
                'ext-1'
            )
            expect(registry.getCommand('test')).toBeDefined()
            expect(registry.getCommand('test')!.description).toBe('Test command')
        })

        it('should return all commands', () => {
            registry.registerCommand('a', { description: 'A', handler: () => {} }, 'ext-1')
            registry.registerCommand('b', { description: 'B', handler: () => {} }, 'ext-2')
            expect(registry.getAllCommands()).toHaveLength(2)
        })
    })

    // ── Settings Tabs ──────────────────────────────────────

    describe('SettingsTabs', () => {
        it('should register and retrieve a settings tab', () => {
            registry.registerSettingsTab(
                'appearance',
                { label: 'Appearance', component: MockComponent, order: 1 },
                'ext-1'
            )
            const tab = registry.getSettingsTab('appearance')
            expect(tab).toBeDefined()
            expect(tab!.label).toBe('Appearance')
        })

        it('should return all tabs sorted by order', () => {
            registry.registerSettingsTab(
                'editor',
                { label: 'Editor', component: MockComponent, order: 20 },
                'ext-1'
            )
            registry.registerSettingsTab(
                'appearance',
                { label: 'Appearance', component: MockComponent, order: 1 },
                'ext-2'
            )
            const tabs = registry.getAllSettingsTabs()
            expect(tabs).toHaveLength(2)
            expect(tabs[0].id).toBe('appearance')
            expect(tabs[1].id).toBe('editor')
        })
    })

    // ── Utilities ──────────────────────────────────────────

    describe('Utilities', () => {
        it('should report stats', () => {
            registry.registerCommand('test', { description: 'Test', handler: () => {} }, 'ext-1')
            const stats = registry.stats()
            expect(stats.commands).toBe(1)
            expect(stats.fileRenderers).toBe(0)
        })

        it('should clear all registries', () => {
            registry.registerCommand('test', { description: 'Test', handler: () => {} }, 'ext-1')
            registry.registerFileRenderer(['.md'], MockComponent, 'ext-1')
            registry.clear()
            const stats = registry.stats()
            expect(Object.values(stats).every((v) => v === 0)).toBe(true)
        })
    })
})
