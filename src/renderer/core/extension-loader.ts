import type { ExtensionManifest } from '@shared/types'
import type { ExtensionActivate } from './extension-api'
import { createExtensionAPI } from './extension-api'
import { EventBus } from './event-bus'
import { ExtensionRegistry } from './registry'

export interface LoadedExtension {
    manifest: ExtensionManifest
    status: 'loaded' | 'error'
    error?: string
}

/**
 * Extension loader.
 *
 * Handles loading both built-in extensions (bundled with the app)
 * and user extensions (from ~/.arpeggio/extensions/ and .arpeggio/extensions/).
 *
 * Built-in extensions are registered programmatically via registerBuiltIn().
 * User extensions are loaded from disk via jiti (handled in main process,
 * but for now we focus on the built-in path which covers P1 requirements).
 */
export class ExtensionLoader {
    private loaded = new Map<string, LoadedExtension>()
    private builtIns = new Map<string, ExtensionActivate>()

    constructor(
        private registry: ExtensionRegistry,
        private eventBus: EventBus
    ) {}

    /**
     * Register a built-in extension's activate function.
     * Called at app startup before loadAll().
     */
    registerBuiltIn(id: string, name: string, activate: ExtensionActivate): void {
        this.builtIns.set(id, activate)
        this.loaded.set(id, {
            manifest: {
                id,
                name,
                version: '0.1.0',
                entryPoint: `built-in:${id}`,
                builtIn: true
            },
            status: 'loaded'
        })
    }

    /**
     * Load and activate all registered extensions.
     */
    async loadAll(): Promise<void> {
        // Load built-in extensions
        for (const [id, activate] of this.builtIns) {
            await this.activateExtension(id, activate)
        }

        console.log(
            `[ExtensionLoader] Loaded ${this.loaded.size} extensions:`,
            this.registry.stats()
        )
    }

    private async activateExtension(id: string, activate: ExtensionActivate): Promise<void> {
        const api = createExtensionAPI(id, this.registry, this.eventBus)

        try {
            await activate(api)
            const entry = this.loaded.get(id)
            if (entry) entry.status = 'loaded'
            this.eventBus.emit('extension:loaded', { extensionId: id })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`[ExtensionLoader] Failed to activate ${id}:`, errorMessage)
            const entry = this.loaded.get(id)
            if (entry) {
                entry.status = 'error'
                entry.error = errorMessage
            }
            this.eventBus.emit('extension:error', { extensionId: id, error: errorMessage })
        }
    }

    getLoaded(): LoadedExtension[] {
        return [...this.loaded.values()]
    }

    getExtension(id: string): LoadedExtension | undefined {
        return this.loaded.get(id)
    }

    isLoaded(id: string): boolean {
        return this.loaded.get(id)?.status === 'loaded'
    }
}
