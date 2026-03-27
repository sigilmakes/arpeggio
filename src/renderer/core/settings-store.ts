/**
 * Persistent settings store backed by localStorage.
 * Each extension's settings are namespaced by extensionId.
 *
 * Storage format: localStorage key = `arpeggio:settings:<extensionId>`, value = JSON object
 */

type SettingsListener = (key: string, value: unknown) => void

export class SettingsStore {
    private cache = new Map<string, Record<string, unknown>>()
    private listeners = new Map<string, Set<SettingsListener>>()

    private getNamespace(extensionId: string): Record<string, unknown> {
        if (this.cache.has(extensionId)) {
            return this.cache.get(extensionId)!
        }

        const storageKey = `arpeggio:settings:${extensionId}`
        try {
            const raw = localStorage.getItem(storageKey)
            const data = raw ? JSON.parse(raw) : {}
            this.cache.set(extensionId, data)
            return data
        } catch {
            const empty = {}
            this.cache.set(extensionId, empty)
            return empty
        }
    }

    private persist(extensionId: string): void {
        const data = this.cache.get(extensionId)
        if (data) {
            const storageKey = `arpeggio:settings:${extensionId}`
            localStorage.setItem(storageKey, JSON.stringify(data))
        }
    }

    get<T>(extensionId: string, key: string): T | undefined {
        const ns = this.getNamespace(extensionId)
        return ns[key] as T | undefined
    }

    set<T>(extensionId: string, key: string, value: T): void {
        const ns = this.getNamespace(extensionId)
        ns[key] = value
        this.persist(extensionId)
        this.notify(extensionId, key, value)
    }

    getAll(extensionId: string): Record<string, unknown> {
        return { ...this.getNamespace(extensionId) }
    }

    /**
     * Listen for setting changes on a specific extension namespace.
     */
    onChange(extensionId: string, listener: SettingsListener): () => void {
        if (!this.listeners.has(extensionId)) {
            this.listeners.set(extensionId, new Set())
        }
        this.listeners.get(extensionId)!.add(listener)

        return () => {
            this.listeners.get(extensionId)?.delete(listener)
        }
    }

    /**
     * Listen for setting changes on ANY extension.
     */
    onAnyChange(listener: (extensionId: string, key: string, value: unknown) => void): () => void {
        const wrappedListeners = new Map<string, SettingsListener>()

        // This is a special '*' namespace
        if (!this.listeners.has('*')) {
            this.listeners.set('*', new Set())
        }
        const wrapped: SettingsListener = (key, value) => listener('', key, value)
        // Actually, let's keep it simple — use a dedicated global set
        this.listeners.get('*')!.add(wrapped)
        wrappedListeners.set('*', wrapped)

        return () => {
            this.listeners.get('*')?.delete(wrapped)
        }
    }

    private notify(extensionId: string, key: string, value: unknown): void {
        // Extension-specific listeners
        const extListeners = this.listeners.get(extensionId)
        if (extListeners) {
            for (const listener of extListeners) {
                try {
                    listener(key, value)
                } catch (error) {
                    console.error(`[SettingsStore] Listener error for ${extensionId}:`, error)
                }
            }
        }

        // Global listeners
        const globalListeners = this.listeners.get('*')
        if (globalListeners) {
            for (const listener of globalListeners) {
                try {
                    listener(`${extensionId}:${key}`, value)
                } catch (error) {
                    console.error('[SettingsStore] Global listener error:', error)
                }
            }
        }
    }

    clear(extensionId: string): void {
        this.cache.delete(extensionId)
        localStorage.removeItem(`arpeggio:settings:${extensionId}`)
    }
}
