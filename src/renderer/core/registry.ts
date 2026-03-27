import type { ComponentType } from 'react'

// ── Registry Entry Types ───────────────────────────────────

export interface FileRendererEntry {
    extensions: string[]
    component: ComponentType<FileRendererProps>
    extensionId: string
}

export interface FileRendererProps {
    path: string
    content: string
    onSave?: (content: string) => void
}

export interface AgentAdapterEntry {
    protocol: string
    factory: AgentAdapterFactory
    extensionId: string
}

export interface AgentAdapterFactory {
    create(config: Record<string, unknown>): AgentAdapterInstance
}

export interface AgentAdapterInstance {
    connect(): Promise<void>
    disconnect(): Promise<void>
    send(message: string): Promise<string>
    onMessage?(handler: (message: string) => void): void
}

export interface AgentTemplateEntry {
    id: string
    displayName: string
    adapter: string
    detect: () => boolean | Promise<boolean>
    defaults: Record<string, unknown>
    extensionId: string
}

export interface SidebarPanelEntry {
    id: string
    icon: ComponentType<{ className?: string }>
    label: string
    component: ComponentType
    position: 'left' | 'right'
    order: number
    extensionId: string
}

export interface ViewEntry {
    id: string
    displayName: string
    component: ComponentType<ViewProps>
    filePatterns: string[]
    extensionId: string
}

export interface ViewProps {
    path?: string
    content?: string
}

export interface CommandEntry {
    name: string
    description: string
    handler: (...args: unknown[]) => void | Promise<void>
    extensionId: string
}

// ── Extension Registry ─────────────────────────────────────

/**
 * Typed registries for all extension capabilities.
 * Extensions register into these; the app shell reads from them.
 */
export class ExtensionRegistry {
    private fileRenderers: FileRendererEntry[] = []
    private agentAdapters = new Map<string, AgentAdapterEntry>()
    private agentTemplates = new Map<string, AgentTemplateEntry>()
    private sidebarPanels = new Map<string, SidebarPanelEntry>()
    private views = new Map<string, ViewEntry>()
    private commands = new Map<string, CommandEntry>()

    // ── File Renderers ─────────────────────────────────────

    registerFileRenderer(
        extensions: string[],
        component: ComponentType<FileRendererProps>,
        extensionId: string
    ): void {
        this.fileRenderers.push({ extensions, component, extensionId })
    }

    getFileRenderer(filePath: string): FileRendererEntry | undefined {
        const ext = '.' + filePath.split('.').pop()?.toLowerCase()
        return this.fileRenderers.find((r) => r.extensions.includes(ext))
    }

    getAllFileRenderers(): FileRendererEntry[] {
        return [...this.fileRenderers]
    }

    // ── Agent Adapters ─────────────────────────────────────

    registerAgentAdapter(
        protocol: string,
        factory: AgentAdapterFactory,
        extensionId: string
    ): void {
        this.agentAdapters.set(protocol, { protocol, factory, extensionId })
    }

    getAgentAdapter(protocol: string): AgentAdapterEntry | undefined {
        return this.agentAdapters.get(protocol)
    }

    getAllAgentAdapters(): AgentAdapterEntry[] {
        return [...this.agentAdapters.values()]
    }

    // ── Agent Templates ────────────────────────────────────

    registerAgentTemplate(
        id: string,
        template: Omit<AgentTemplateEntry, 'id' | 'extensionId'>,
        extensionId: string
    ): void {
        this.agentTemplates.set(id, { ...template, id, extensionId })
    }

    getAgentTemplate(id: string): AgentTemplateEntry | undefined {
        return this.agentTemplates.get(id)
    }

    getAllAgentTemplates(): AgentTemplateEntry[] {
        return [...this.agentTemplates.values()]
    }

    // ── Sidebar Panels ─────────────────────────────────────

    registerSidebarPanel(
        id: string,
        panel: Omit<SidebarPanelEntry, 'id' | 'extensionId'>,
        extensionId: string
    ): void {
        this.sidebarPanels.set(id, { ...panel, id, extensionId })
    }

    getSidebarPanel(id: string): SidebarPanelEntry | undefined {
        return this.sidebarPanels.get(id)
    }

    getSidebarPanels(position: 'left' | 'right'): SidebarPanelEntry[] {
        return [...this.sidebarPanels.values()]
            .filter((p) => p.position === position)
            .sort((a, b) => a.order - b.order)
    }

    getAllSidebarPanels(): SidebarPanelEntry[] {
        return [...this.sidebarPanels.values()]
    }

    // ── Views ──────────────────────────────────────────────

    registerView(
        id: string,
        view: Omit<ViewEntry, 'id' | 'extensionId'>,
        extensionId: string
    ): void {
        this.views.set(id, { ...view, id, extensionId })
    }

    getView(id: string): ViewEntry | undefined {
        return this.views.get(id)
    }

    getViewForFile(filePath: string): ViewEntry | undefined {
        const fileName = filePath.split('/').pop() ?? ''
        return [...this.views.values()].find((v) =>
            v.filePatterns.some((pattern) => {
                const regex = new RegExp(
                    '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
                )
                return regex.test(fileName)
            })
        )
    }

    getAllViews(): ViewEntry[] {
        return [...this.views.values()]
    }

    // ── Commands ───────────────────────────────────────────

    registerCommand(
        name: string,
        command: Omit<CommandEntry, 'name' | 'extensionId'>,
        extensionId: string
    ): void {
        this.commands.set(name, { ...command, name, extensionId })
    }

    getCommand(name: string): CommandEntry | undefined {
        return this.commands.get(name)
    }

    getAllCommands(): CommandEntry[] {
        return [...this.commands.values()]
    }

    // ── Utilities ──────────────────────────────────────────

    clear(): void {
        this.fileRenderers.length = 0
        this.agentAdapters.clear()
        this.agentTemplates.clear()
        this.sidebarPanels.clear()
        this.views.clear()
        this.commands.clear()
    }

    stats(): Record<string, number> {
        return {
            fileRenderers: this.fileRenderers.length,
            agentAdapters: this.agentAdapters.size,
            agentTemplates: this.agentTemplates.size,
            sidebarPanels: this.sidebarPanels.size,
            views: this.views.size,
            commands: this.commands.size
        }
    }
}
