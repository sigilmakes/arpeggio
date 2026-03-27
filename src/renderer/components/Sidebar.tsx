import React from 'react'
import type { SidebarPanelEntry } from '../core/registry'

interface SidebarProps {
    position: 'left' | 'right'
    panels: SidebarPanelEntry[]
    activePanel: string
    onPanelSelect: (id: string) => void
    isOpen: boolean
}

export function Sidebar({
    position,
    panels,
    activePanel,
    onPanelSelect,
    isOpen
}: SidebarProps): React.ReactElement {
    const activeEntry = panels.find((p) => p.id === activePanel)
    const ActiveComponent = activeEntry?.component

    return (
        <div className={`sidebar sidebar-${position} ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* Icon strip */}
            <div className="sidebar-icons">
                {panels.map((panel) => {
                    const Icon = panel.icon
                    return (
                        <button
                            key={panel.id}
                            className={`sidebar-icon-btn ${panel.id === activePanel && isOpen ? 'active' : ''}`}
                            onClick={() => onPanelSelect(panel.id)}
                            title={panel.label}
                        >
                            <Icon className="sidebar-icon" />
                        </button>
                    )
                })}
            </div>

            {/* Panel content */}
            {isOpen && ActiveComponent && (
                <div className="sidebar-panel-content">
                    <ActiveComponent />
                </div>
            )}
        </div>
    )
}
