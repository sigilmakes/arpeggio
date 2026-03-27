import React from 'react'
import type { OpenTab } from '@shared/types'

interface TabBarProps {
    tabs: OpenTab[]
    activeTabId: string | null
    onSelectTab: (id: string) => void
    onCloseTab: (id: string) => void
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps): React.ReactElement | null {
    if (tabs.length === 0) return null

    return (
        <div className="tab-bar">
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
