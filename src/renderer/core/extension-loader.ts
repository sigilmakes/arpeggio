import type { ExtensionManifest } from '@shared/types'
import type { ExtensionActivate } from './extension-api'
import { createExtensionAPI } from './extension-api'
import { EventBus } from './event-bus'
import { ExtensionRegistry } from './registry'
import { SettingsStore } from './settings-store'

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
 * User extensions are loaded from disk via jiti at runtime.
 */
export class ExtensionLoader {
    private loaded = new Map<string, LoadedExtension>()
    private builtIns = new Map<string, ExtensionActivate>()

    constructor(
        private registry: ExtensionRegistry,
        private eventBus: EventBus,
        private settingsStore: SettingsStore
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
     * Load and activate all registered extensions (built-in + user).
     */
    async loadAll(): Promise<void> {
        // Load built-in extensions
        for (const [id, activate] of this.builtIns) {
            await this.activateExtension(id, activate)
        }

        // Scan and load user extensions from disk
        await this.loadUserExtensions()

        console.log(
            `[ExtensionLoader] Loaded ${this.loaded.size} extensions:`,
            this.registry.stats()
        )
    }

    /**
     * Scan for user extensions and load them via dynamic import.
     * Scans global (~/.arpeggio/extensions/) and workspace-local
     * (.arpeggio/extensions/) directories for .ts files and subdirectories.
     */
    private async loadUserExtensions(): Promise<void> {
        if (typeof window === 'undefined' || !window.electron?.extensions) {
            return
        }

        try {
            const manifests = (await window.electron.extensions.scan()) as ExtensionManifest[]

            for (const manifest of manifests) {
                try {
                    // Read the extension source from main process
                    const source = await window.electron.extensions.readSource(manifest.entryPoint)

                    // Create a module from the source using Function constructor
                    // This gives extensions access to the API but runs in renderer context
                    const activate = this.evaluateExtensionSource(source, manifest.id)

                    if (activate) {
                        this.loaded.set(manifest.id, { manifest, status: 'loaded' })
                        await this.activateExtension(manifest.id, activate)
                        console.log(`[ExtensionLoader] Loaded user extension: ${manifest.id}`)
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    console.error(
                        `[ExtensionLoader] Failed to load user extension ${manifest.id}:`,
                        errorMessage
                    )
                    this.loaded.set(manifest.id, {
                        manifest,
                        status: 'error',
                        error: errorMessage
                    })
                    this.eventBus.emit('extension:error', {
                        extensionId: manifest.id,
                        error: errorMessage
                    })
                }
            }
        } catch (error) {
            console.warn('[ExtensionLoader] Extension scanning not available:', error)
        }
    }

    /**
     * Evaluate extension source code and extract the activate function.
     * Extensions should export a default function.
     */
    private evaluateExtensionSource(source: string, _id: string): ExtensionActivate | null {
        try {
            // Simple module evaluation — wraps source as a module with exports
            const moduleExports: Record<string, unknown> = {}
            const moduleFn = new Function('exports', 'module', source)
            const module = { exports: moduleExports }
            moduleFn(moduleExports, module)

            const activate =
                (module.exports as Record<string, unknown>).default ?? module.exports
            if (typeof activate === 'function') {
                return activate as ExtensionActivate
            }

            console.warn(
                `[ExtensionLoader] Extension does not export a function`
            )
            return null
        } catch (error) {
            console.error(`[ExtensionLoader] Failed to evaluate extension source:`, error)
            return null
        }
    }

    private async activateExtension(id: string, activate: ExtensionActivate): Promise<void> {
        const api = createExtensionAPI(id, this.registry, this.eventBus, this.settingsStore)

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
