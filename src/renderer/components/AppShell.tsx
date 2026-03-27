import React, { useState, useEffect, useCallback } from 'react'
import { useRegistry } from '../context/ExtensionContext'
import { Sidebar } from './Sidebar'
import { ResizeHandle } from './ResizeHandle'
import { CenterPane } from './CenterPane'
import { Settings } from './Settings'

const MIN_PANEL_WIDTH = 180
const MAX_PANEL_WIDTH = 500
const DEFAULT_LEFT_WIDTH = 260
const DEFAULT_RIGHT_WIDTH = 260

export function AppShell(): React.ReactElement {
    const registry = useRegistry()
    const [activeLeftPanel, setActiveLeftPanel] = useState<string>('file-browser')
    const [activeRightPanel, setActiveRightPanel] = useState<string>('agent-manager')
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
    const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH)

    const leftPanels = registry.getSidebarPanels('left')
    const rightPanels = registry.getSidebarPanels('right')

    const openSettings = useCallback(() => setSettingsOpen(true), [])
    const closeSettings = useCallback(() => setSettingsOpen(false), [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault()
                setSettingsOpen((prev) => !prev)
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
    }, [registry, openSettings])

    const handleLeftResize = useCallback((delta: number) => {
        setLeftWidth((w) => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, w + delta)))
    }, [])

    const handleRightResize = useCallback((delta: number) => {
        setRightWidth((w) => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, w + delta)))
    }, [])

    return (
        <div className="app-shell">
            <Sidebar
                position="left"
                panels={leftPanels}
                activePanel={activeLeftPanel}
                panelWidth={leftWidth}
                onPanelSelect={(id) => {
                    if (id === activeLeftPanel) {
                        setLeftSidebarOpen(!leftSidebarOpen)
                    } else {
                        setActiveLeftPanel(id)
                        setLeftSidebarOpen(true)
                    }
                }}
                isOpen={leftSidebarOpen}
                onOpenSettings={openSettings}
            />
            {leftSidebarOpen && <ResizeHandle side="left" onResize={handleLeftResize} />}

            <CenterPane />

            {rightSidebarOpen && <ResizeHandle side="right" onResize={handleRightResize} />}
            <Sidebar
                position="right"
                panels={rightPanels}
                activePanel={activeRightPanel}
                panelWidth={rightWidth}
                onPanelSelect={(id) => {
                    if (id === activeRightPanel) {
                        setRightSidebarOpen(!rightSidebarOpen)
                    } else {
                        setActiveRightPanel(id)
                        setRightSidebarOpen(true)
                    }
                }}
                isOpen={rightSidebarOpen}
            />

            <Settings isOpen={settingsOpen} onClose={closeSettings} />
        </div>
    )
}
