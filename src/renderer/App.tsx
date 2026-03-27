import React, { useEffect, useState, Component, type ErrorInfo, type ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { ExtensionProvider, useExtensions } from './context/ExtensionContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ChatProvider } from './context/ChatContext'
import { initExtensions } from './init-extensions'
import { ExtensionRegistry } from './core/registry'
import { EventBus } from './core/event-bus'
import { ExtensionLoader } from './core/extension-loader'
import { SettingsStore } from './core/settings-store'

// ── Error Boundary ─────────────────────────────────────────

interface ErrorBoundaryState {
    error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[Arpeggio] React error:', error, info.componentStack)
    }

    render(): ReactNode {
        if (this.state.error) {
            return (
                <div className="app-error">
                    <h1>Something went wrong</h1>
                    <p>{this.state.error.message}</p>
                    <pre style={{ fontSize: '0.75rem', marginTop: '1rem', opacity: 0.6 }}>
                        {this.state.error.stack}
                    </pre>
                </div>
            )
        }
        return this.props.children
    }
}

// ── App Content ────────────────────────────────────────────

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

// ── App Root ───────────────────────────────────────────────

export default function App(): React.ReactElement {
    const [ctx, setCtx] = useState<{
        registry: ExtensionRegistry
        eventBus: EventBus
        loader: ExtensionLoader
        settingsStore: SettingsStore
    } | null>(null)
    const [initError, setInitError] = useState<string | null>(null)

    useEffect(() => {
        const registry = new ExtensionRegistry()
        const eventBus = new EventBus()
        const settingsStore = new SettingsStore()
        const loader = new ExtensionLoader(registry, eventBus, settingsStore)

        initExtensions(loader)
        loader
            .loadAll()
            .then(() => {
                setCtx({ registry, eventBus, loader, settingsStore })
            })
            .catch((err) => {
                console.error('[Arpeggio] Failed to initialize:', err)
                setInitError(err instanceof Error ? err.message : String(err))
            })
    }, [])

    if (initError) {
        return (
            <div className="app-error">
                <h1>Failed to initialize</h1>
                <p>{initError}</p>
            </div>
        )
    }

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
        <ErrorBoundary>
            <ExtensionProvider
                registry={ctx.registry}
                eventBus={ctx.eventBus}
                loader={ctx.loader}
                settingsStore={ctx.settingsStore}
            >
                <WorkspaceProvider>
                    <ChatProvider>
                        <AppContent />
                    </ChatProvider>
                </WorkspaceProvider>
            </ExtensionProvider>
        </ErrorBoundary>
    )
}
