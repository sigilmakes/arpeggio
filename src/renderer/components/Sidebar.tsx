import React from 'react'
import type { SidebarPanelEntry } from '../core/registry'

interface SidebarProps {
    position: 'left' | 'right'
    panels: SidebarPanelEntry[]
    activePanel: string
    onPanelSelect: (id: string) => void
    isOpen: boolean
    onOpenSettings?: () => void
}

function SettingsGearIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path d="M16.2 12.2a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.85 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.85h-.14a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.85-1.28v-.14a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.85 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.85h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.85z" />
        </svg>
    )
}

function HelpIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <circle cx="10" cy="10" r="7" />
            <path d="M8 7.5a2 2 0 012.8-1.8 2 2 0 01.7 3.3c-.5.5-1 .8-1 1.5" />
            <circle cx="10.5" cy="13.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
    )
}

export function Sidebar({
    position,
    panels,
    activePanel,
    onPanelSelect,
    isOpen,
    onOpenSettings
}: SidebarProps): React.ReactElement {
    const activeEntry = panels.find((p) => p.id === activePanel)
    const ActiveComponent = activeEntry?.component

    return (
        <div className={`sidebar sidebar-${position} ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* Icon strip */}
            <div className="sidebar-icons">
                <div className="sidebar-icons-top">
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

                {/* Bottom actions — only on left sidebar, like Obsidian */}
                {position === 'left' && onOpenSettings && (
                    <div className="sidebar-icons-bottom">
                        <button
                            className="sidebar-icon-btn"
                            onClick={() => {}}
                            title="Help"
                        >
                            <HelpIcon className="sidebar-icon" />
                        </button>
                        <button
                            className="sidebar-icon-btn"
                            onClick={onOpenSettings}
                            title="Settings"
                        >
                            <SettingsGearIcon className="sidebar-icon" />
                        </button>
                    </div>
                )}
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
