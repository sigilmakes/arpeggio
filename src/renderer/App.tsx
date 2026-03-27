import React, { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ExtensionProvider, useExtensions } from './context/ExtensionContext'
import { initExtensions } from './init-extensions'
import { ExtensionRegistry } from './core/registry'
import { EventBus } from './core/event-bus'
import { ExtensionLoader } from './core/extension-loader'
import { SettingsStore } from './core/settings-store'

function AppContent(): React.ReactElement {
    const { loading, error } = useExtensions()

    if (loading) {
        return (
            <div className="app-loading">
                <div className="app-loading-inner">
                    <h1>Arpeggio</h1>
                    <p>Loading extensions…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="app-error">
                <h1>Failed to start</h1>
                <p>{error}</p>
            </div>
        )
    }

    return <AppShell />
}

export default function App(): React.ReactElement {
    const [ctx, setCtx] = useState<{
        registry: ExtensionRegistry
        eventBus: EventBus
        loader: ExtensionLoader
        settingsStore: SettingsStore
    } | null>(null)

    useEffect(() => {
        const registry = new ExtensionRegistry()
        const eventBus = new EventBus()
        const settingsStore = new SettingsStore()
        const loader = new ExtensionLoader(registry, eventBus, settingsStore)

        initExtensions(loader)
        loader.loadAll().then(() => {
            setCtx({ registry, eventBus, loader, settingsStore })
        })
    }, [])

    if (!ctx) {
        return (
            <div className="app-loading">
                <div className="app-loading-inner">
                    <h1>Arpeggio</h1>
                    <p>Initializing…</p>
                </div>
            </div>
        )
    }

    return (
        <ExtensionProvider
            registry={ctx.registry}
            eventBus={ctx.eventBus}
            loader={ctx.loader}
            settingsStore={ctx.settingsStore}
        >
            <AppContent />
        </ExtensionProvider>
    )
}
