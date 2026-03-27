import React, { useState, useEffect, useCallback } from 'react'
import { useRegistry } from '../context/ExtensionContext'
import { Sidebar } from './Sidebar'
import { ResizeHandle } from './ResizeHandle'
import { CenterPane } from './CenterPane'
import { Settings } from './Settings'

const MIN_PANEL_WIDTH = 180
const MAX_PANEL_WIDTH = 500
const DEFAULT_LEFT_WIDTH = 260

export function AppShell(): React.ReactElement {
    const registry = useRegistry()
    const [activePanel, setActivePanel] = useState<string>('file-browser')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_LEFT_WIDTH)

    const panels = registry.getSidebarPanels('left')

    const openSettings = useCallback(() => setSettingsOpen(true), [])
    const closeSettings = useCallback(() => setSettingsOpen(false), [])
    const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault()
                setSettingsOpen((prev) => !prev)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault()
                setSidebarOpen((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        registry.registerCommand(
            'open-settings',
            { description: 'Open settings', handler: openSettings },
            'arpeggio.core'
        )
        registry.registerCommand(
            'toggle-sidebar',
            { description: 'Toggle sidebar', handler: toggleSidebar },
            'arpeggio.core'
        )
    }, [registry, openSettings, toggleSidebar])

    const handleResize = useCallback((delta: number) => {
        setSidebarWidth((w) => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, w + delta)))
    }, [])

    return (
        <div className="app-shell">
            {sidebarOpen && (
                <>
                    <Sidebar
                        panels={panels}
                        activePanel={activePanel}
                        panelWidth={sidebarWidth}
                        onPanelSelect={setActivePanel}
                        onOpenSettings={openSettings}
                    />
                    <ResizeHandle side="left" onResize={handleResize} />
                </>
            )}

            <CenterPane sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

            <Settings isOpen={settingsOpen} onClose={closeSettings} />
        </div>
    )
}
