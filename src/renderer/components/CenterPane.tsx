import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { useRegistry } from '../context/ExtensionContext'
import { TabBar } from './TabBar'
import type { ExtensionRegistry } from '../core/registry'

interface CenterPaneProps {
    sidebarOpen: boolean
    onToggleSidebar: () => void
}

export function CenterPane({ sidebarOpen, onToggleSidebar }: CenterPaneProps): React.ReactElement {
    const { activeWorkspace, openTabs, activeTabId, setActiveTab, closeTab } = useWorkspace()
    const registry = useRegistry()

    const activeTab = openTabs.find((t) => t.id === activeTabId)

    return (
        <div className="center-pane">
            <TabBar
                tabs={openTabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTab}
                onCloseTab={closeTab}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={onToggleSidebar}
            />

            {activeTab ? (
                <FileViewer key={activeTab.path} path={activeTab.path} registry={registry} />
            ) : (
                <div className="center-pane-empty">
                    <div className="center-pane-logo">
                        <h1>Arpeggio</h1>
                        {activeWorkspace ? (
                            <p>Open a file from the sidebar</p>
                        ) : (
                            <p>Select or create a workspace to get started</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── File Viewer ────────────────────────────────────────────

interface FileViewerProps {
    path: string
    registry: ExtensionRegistry
}

function FileViewer({ path, registry }: FileViewerProps): React.ReactElement {
    const [content, setContent] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const isBinary = /\.(png|jpg|jpeg|gif|webp|bmp|ico|pdf)$/i.test(path)

    useEffect(() => {
        if (isBinary) {
            setContent('')
            return
        }

        setContent(null)
        setError(null)

        window.electron.fs
            .readFile(path)
            .then((text) => setContent(text))
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }, [path, isBinary])

    const handleSave = useCallback(
        (newContent: string) => {
            window.electron.fs.writeFile(path, newContent).catch((err) => {
                console.error('Failed to save file:', err)
            })
        },
        [path]
    )

    if (error) {
        return (
            <div className="file-viewer-error">
                <p>Failed to read file</p>
                <p className="file-viewer-error-detail">{error}</p>
            </div>
        )
    }

    if (content === null) {
        return (
            <div className="file-viewer-loading">
                <p>Loading…</p>
            </div>
        )
    }

    const rendererEntry = registry.getFileRenderer(path)
    if (rendererEntry) {
        const Renderer = rendererEntry.component
        return <Renderer path={path} content={content} onSave={handleSave} />
    }

    return (
        <div className="plaintext-renderer">
            <div className="plaintext-header">
                <span className="plaintext-filename">{path.split('/').pop()}</span>
                <span className="plaintext-meta">{content.split('\n').length} lines</span>
            </div>
            <pre className="plaintext-content">
                <code>{content}</code>
            </pre>
        </div>
    )
}
