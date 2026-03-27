import React, { createContext, useContext } from 'react'
import { ExtensionRegistry } from '../core/registry'
import { EventBus } from '../core/event-bus'
import { ExtensionLoader } from '../core/extension-loader'
import { SettingsStore } from '../core/settings-store'

interface ExtensionContextValue {
    registry: ExtensionRegistry
    eventBus: EventBus
    loader: ExtensionLoader
    settingsStore: SettingsStore
    loading: boolean
    error: string | null
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null)

interface ExtensionProviderProps {
    children: React.ReactNode
    registry: ExtensionRegistry
    eventBus: EventBus
    loader: ExtensionLoader
    settingsStore: SettingsStore
}

export function ExtensionProvider({
    children,
    registry,
    eventBus,
    loader,
    settingsStore
}: ExtensionProviderProps): React.ReactElement {
    return (
        <ExtensionContext.Provider
            value={{
                registry,
                eventBus,
                loader,
                settingsStore,
                loading: false,
                error: null
            }}
        >
            {children}
        </ExtensionContext.Provider>
    )
}

export function useExtensions(): ExtensionContextValue {
    const ctx = useContext(ExtensionContext)
    if (!ctx) {
        throw new Error('useExtensions must be used within an ExtensionProvider')
    }
    return ctx
}

export function useRegistry(): ExtensionRegistry {
    return useExtensions().registry
}

export function useEventBus(): EventBus {
    return useExtensions().eventBus
}

export function useSettingsStore(): SettingsStore {
    return useExtensions().settingsStore
}
