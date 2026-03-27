import React from 'react'
import type { OpenTab } from '@shared/types'

interface TabBarProps {
    tabs: OpenTab[]
    activeTabId: string | null
    onSelectTab: (id: string) => void
    onCloseTab: (id: string) => void
    sidebarOpen: boolean
    onToggleSidebar: () => void
}

function SidebarToggleIcon(): React.ReactElement {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <path d="M7 3v14" />
        </svg>
    )
}

export function TabBar({
    tabs,
    activeTabId,
    onSelectTab,
    onCloseTab,
    sidebarOpen,
    onToggleSidebar
}: TabBarProps): React.ReactElement {
    return (
        <div className="tab-bar">
            <button
                className={`tab-bar-sidebar-toggle ${sidebarOpen ? 'active' : ''}`}
                onClick={onToggleSidebar}
                title="Toggle sidebar (Ctrl+E)"
            >
                <SidebarToggleIcon />
            </button>

            <div className="tab-bar-tabs">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`tab-bar-tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => onSelectTab(tab.id)}
                    >
                        <span className="tab-bar-tab-label">{tab.label}</span>
                        <button
                            className="tab-bar-tab-close"
                            onClick={(e) => {
                                e.stopPropagation()
                                onCloseTab(tab.id)
                            }}
                            title="Close tab"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
