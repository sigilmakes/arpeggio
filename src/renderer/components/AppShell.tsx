import React, { useState, useEffect, useCallback } from 'react'
import { useRegistry } from '../context/ExtensionContext'
import { Sidebar } from './Sidebar'
import { CenterPane } from './CenterPane'
import { Settings } from './Settings'

export function AppShell(): React.ReactElement {
    const registry = useRegistry()
    const [activeLeftPanel, setActiveLeftPanel] = useState<string>('file-browser')
    const [activeRightPanel, setActiveRightPanel] = useState<string>('agent-manager')
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
    const [settingsOpen, setSettingsOpen] = useState(false)

    const leftPanels = registry.getSidebarPanels('left')
    const rightPanels = registry.getSidebarPanels('right')

    const openSettings = useCallback(() => setSettingsOpen(true), [])
    const closeSettings = useCallback(() => setSettingsOpen(false), [])

    // Ctrl+, to open settings
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

    return (
        <div className="app-shell">
            {/* Left sidebar — unified: workspace header + panel icons + content */}
            <Sidebar
                position="left"
                panels={leftPanels}
                activePanel={activeLeftPanel}
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

            {/* Center pane */}
            <CenterPane />

            {/* Right sidebar */}
            <Sidebar
                position="right"
                panels={rightPanels}
                activePanel={activeRightPanel}
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
