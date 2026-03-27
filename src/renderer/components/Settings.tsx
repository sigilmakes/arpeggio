import React, { useState, useEffect, useCallback } from 'react'
import { useRegistry, useSettingsStore } from '../context/ExtensionContext'

interface SettingsProps {
    isOpen: boolean
    onClose: () => void
}

export function Settings({ isOpen, onClose }: SettingsProps): React.ReactElement | null {
    const registry = useRegistry()
    const settingsStore = useSettingsStore()
    const tabs = registry.getAllSettingsTabs()
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? '')

    // Update active tab if tabs change
    useEffect(() => {
        if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
            setActiveTab(tabs[0].id)
        }
    }, [tabs, activeTab])

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const activeEntry = tabs.find((t) => t.id === activeTab)
    const ActiveComponent = activeEntry?.component

    // Create scoped getSetting/setSetting for the active tab's extension
    const extensionId = activeEntry?.extensionId ?? ''

    const getSetting = useCallback(
        <T,>(key: string): T | undefined => settingsStore.get<T>(extensionId, key),
        [settingsStore, extensionId]
    )

    const setSetting = useCallback(
        <T,>(key: string, value: T): void => settingsStore.set(extensionId, key, value),
        [settingsStore, extensionId]
    )

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                {/* Left nav */}
                <nav className="settings-nav">
                    <h2 className="settings-nav-title">Settings</h2>
                    <ul className="settings-nav-list">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <li key={tab.id}>
                                    <button
                                        className={`settings-nav-item ${tab.id === activeTab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {Icon && <Icon className="settings-nav-icon" />}
                                        <span>{tab.label}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Right content */}
                <div className="settings-content">
                    <div className="settings-content-header">
                        <h2>{activeEntry?.label ?? 'Settings'}</h2>
                        <button className="settings-close-btn" onClick={onClose} title="Close">
                            ✕
                        </button>
                    </div>
                    <div className="settings-content-body">
                        {ActiveComponent ? (
                            <ActiveComponent getSetting={getSetting} setSetting={setSetting} />
                        ) : (
                            <p className="panel-placeholder">No settings available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
