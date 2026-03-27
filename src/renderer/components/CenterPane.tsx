import React, { useState, useEffect } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { useRegistry } from '../context/ExtensionContext'
import { TabBar } from './TabBar'

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
                <FileViewer path={activeTab.path} registry={registry} />
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

import type { ExtensionRegistry } from '../core/registry'

interface FileViewerProps {
    path: string
    registry: ExtensionRegistry
}

function FileViewer({ path, registry }: FileViewerProps): React.ReactElement {
    const [content, setContent] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setContent(null)
        setError(null)

        window.electron.fs
            .readFile(path)
            .then((text) => setContent(text))
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }, [path])

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

    // Find a renderer for this file type
    const rendererEntry = registry.getFileRenderer(path)
    if (rendererEntry) {
        const Renderer = rendererEntry.component
        return <Renderer path={path} content={content} />
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
