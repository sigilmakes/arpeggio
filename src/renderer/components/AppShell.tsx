import React, { useState } from 'react'
import { useRegistry } from '../context/ExtensionContext'
import { Sidebar } from './Sidebar'
import { CenterPane } from './CenterPane'

export function AppShell(): React.ReactElement {
    const registry = useRegistry()
    const [activeLeftPanel, setActiveLeftPanel] = useState<string>('file-browser')
    const [activeRightPanel, setActiveRightPanel] = useState<string>('agent-manager')
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

    const leftPanels = registry.getSidebarPanels('left')
    const rightPanels = registry.getSidebarPanels('right')

    return (
        <div className="app-shell">
            {/* Left sidebar */}
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
        </div>
    )
}
