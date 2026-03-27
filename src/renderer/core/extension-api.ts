import type { ComponentType } from 'react'
import type { ArpeggioEvents, ArpeggioEventName } from '@shared/types'
import { EventBus } from './event-bus'
import {
    ExtensionRegistry,
    type FileRendererProps,
    type AgentAdapterFactory,
    type AgentTemplateEntry,
    type SidebarPanelEntry,
    type ViewEntry,
    type ViewProps
} from './registry'

// ── ArpeggioAPI ────────────────────────────────────────────

/**
 * The API surface given to every extension's `activate` function.
 * This is the contract between extensions and Arpeggio.
 */
export interface ArpeggioAPI {
    // Registries
    registerFileRenderer(extensions: string[], component: ComponentType<FileRendererProps>): void
    registerAgentAdapter(protocol: string, adapter: AgentAdapterFactory): void
    registerAgentTemplate(
        id: string,
        template: {
            displayName: string
            adapter: string
            detect: () => boolean | Promise<boolean>
            defaults: Record<string, unknown>
        }
    ): void
    registerSidebarPanel(
        id: string,
        panel: {
            icon: ComponentType<{ className?: string }>
            label: string
            component: ComponentType
            position: 'left' | 'right'
            order?: number
        }
    ): void
    registerView(
        id: string,
        view: {
            displayName: string
            component: ComponentType<ViewProps>
            filePatterns?: string[]
        }
    ): void
    registerCommand(
        name: string,
        command: {
            description: string
            handler: (...args: unknown[]) => void | Promise<void>
        }
    ): void

    // Events
    on<E extends ArpeggioEventName>(
        event: E,
        handler: (payload: ArpeggioEvents[E]) => void | Promise<void>
    ): { unsubscribe: () => void }

    // Extension metadata
    readonly extensionId: string
}

// ── Extension activate function type ───────────────────────

export type ExtensionActivate = (app: ArpeggioAPI) => void | Promise<void>

// ── Implementation ─────────────────────────────────────────

/**
 * Creates an ArpeggioAPI instance scoped to a specific extension.
 * Each extension gets its own API instance so registrations are tagged.
 */
export function createExtensionAPI(
    extensionId: string,
    registry: ExtensionRegistry,
    eventBus: EventBus
): ArpeggioAPI {
    return {
        extensionId,

        registerFileRenderer(extensions, component) {
            registry.registerFileRenderer(extensions, component, extensionId)
        },

        registerAgentAdapter(protocol, adapter) {
            registry.registerAgentAdapter(protocol, adapter, extensionId)
        },

        registerAgentTemplate(id, template) {
            registry.registerAgentTemplate(id, template as Omit<AgentTemplateEntry, 'id' | 'extensionId'>, extensionId)
        },

        registerSidebarPanel(id, panel) {
            registry.registerSidebarPanel(
                id,
                {
                    ...panel,
                    order: panel.order ?? 100
                } as Omit<SidebarPanelEntry, 'id' | 'extensionId'>,
                extensionId
            )
        },

        registerView(id, view) {
            registry.registerView(
                id,
                {
                    ...view,
                    filePatterns: view.filePatterns ?? []
                } as Omit<ViewEntry, 'id' | 'extensionId'>,
                extensionId
            )
        },

        registerCommand(name, command) {
            registry.registerCommand(name, command, extensionId)
        },

        on(event, handler) {
            return eventBus.on(event, handler)
        }
    }
}
