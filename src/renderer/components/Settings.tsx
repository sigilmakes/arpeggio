import React, { useState, useEffect, useCallback } from 'react'
import { useRegistry, useSettingsStore } from '../context/ExtensionContext'

interface SettingsProps {
    isOpen: boolean
    onClose: () => void
}

// Tabs with order < 0 go in "Options", others go in "Extensions"
const OPTIONS_THRESHOLD = 0

export function Settings({ isOpen, onClose }: SettingsProps): React.ReactElement | null {
    const registry = useRegistry()
    const settingsStore = useSettingsStore()
    const allTabs = registry.getAllSettingsTabs()
    const [activeTab, setActiveTab] = useState<string>(allTabs[0]?.id ?? '')

    const optionsTabs = allTabs.filter((t) => t.order < OPTIONS_THRESHOLD)
    const extensionTabs = allTabs.filter((t) => t.order >= OPTIONS_THRESHOLD)

    useEffect(() => {
        if (allTabs.length > 0 && !allTabs.find((t) => t.id === activeTab)) {
            setActiveTab(allTabs[0].id)
        }
    }, [allTabs, activeTab])

    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const activeEntry = allTabs.find((t) => t.id === activeTab)
    const ActiveComponent = activeEntry?.component
    const extensionId = activeEntry?.extensionId ?? ''

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <nav className="settings-nav">
                    {/* Options section */}
                    {optionsTabs.length > 0 && (
                        <div className="settings-nav-section">
                            <h3 className="settings-nav-heading">Options</h3>
                            <ul className="settings-nav-list">
                                {optionsTabs.map((tab) => {
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
                        </div>
                    )}

                    {/* Extension settings section */}
                    {extensionTabs.length > 0 && (
                        <div className="settings-nav-section">
                            <h3 className="settings-nav-heading">Extension settings</h3>
                            <ul className="settings-nav-list">
                                {extensionTabs.map((tab) => {
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
                        </div>
                    )}
                </nav>

                <div className="settings-content">
                    <div className="settings-content-header">
                        <h2>{activeEntry?.label ?? 'Settings'}</h2>
                        <button className="settings-close-btn" onClick={onClose} title="Close (Esc)">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                        </button>
                    </div>
                    <div className="settings-content-body">
                        {ActiveComponent ? (
                            <SettingsTabWrapper
                                key={activeTab}
                                component={ActiveComponent}
                                extensionId={extensionId}
                            />
                        ) : (
                            <p className="panel-placeholder">No settings available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function SettingsTabWrapper({
    component: Component,
    extensionId
}: {
    component: React.ComponentType<{ getSetting: <T>(key: string) => T | undefined; setSetting: <T>(key: string, value: T) => void }>
    extensionId: string
}): React.ReactElement {
    const settingsStore = useSettingsStore()

    const getSetting = useCallback(
        <T,>(key: string): T | undefined => settingsStore.get<T>(extensionId, key),
        [settingsStore, extensionId]
    )

    const setSetting = useCallback(
        <T,>(key: string, value: T): void => settingsStore.set(extensionId, key, value),
        [settingsStore, extensionId]
    )

    return <Component getSetting={getSetting} setSetting={setSetting} />
}
