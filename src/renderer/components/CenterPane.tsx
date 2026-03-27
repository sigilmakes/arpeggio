import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { useRegistry } from '../context/ExtensionContext'
import { TabBar } from './TabBar'
import type { ExtensionRegistry } from '../core/registry'

export function CenterPane(): React.ReactElement {
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

    // Check if this is a binary file type that doesn't need text content
    const isBinary = /\.(png|jpg|jpeg|gif|webp|bmp|ico|pdf)$/i.test(path)

    useEffect(() => {
        if (isBinary) {
            // Binary files don't need text content — pass empty string
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

    // Find a registered renderer
    const rendererEntry = registry.getFileRenderer(path)
    if (rendererEntry) {
        const Renderer = rendererEntry.component
        return <Renderer path={path} content={content} onSave={handleSave} />
    }

    // Fallback: plaintext
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
