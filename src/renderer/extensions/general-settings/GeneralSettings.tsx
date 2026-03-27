import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function GeneralSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="7" />
            <path d="M10 6v4l2.5 1.5" />
        </svg>
    )
}

export function GeneralSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [restoreLastWorkspace, setRestoreLastWorkspace] = useState(
        () => getSetting<boolean>('restoreLastWorkspace') ?? true
    )
    const [confirmDelete, setConfirmDelete] = useState(
        () => getSetting<boolean>('confirmDelete') ?? true
    )

    useEffect(() => { setSetting('restoreLastWorkspace', restoreLastWorkspace) }, [restoreLastWorkspace, setSetting])
    useEffect(() => { setSetting('confirmDelete', confirmDelete) }, [confirmDelete, setSetting])

    return (
        <div>
            {/* About section */}
            <div className="settings-about">
                <div className="settings-about-name">Arpeggio</div>
                <div className="settings-about-version">Version 0.1.0</div>
                <div className="settings-about-desc">An agentic IDE for multi-agent orchestration</div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Restore last workspace</div>
                    <div className="setting-item-description">
                        Automatically open the last active workspace when the app starts.
                    </div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={restoreLastWorkspace} onChange={setRestoreLastWorkspace} />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Confirm before delete</div>
                    <div className="setting-item-description">
                        Show a confirmation dialog before deleting workspaces or files.
                    </div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={confirmDelete} onChange={setConfirmDelete} />
                </div>
            </div>
        </div>
    )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.ReactElement {
    return (
        <button
            className={`toggle-switch ${checked ? 'on' : ''}`}
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
        >
            <span className="toggle-switch-thumb" />
        </button>
    )
}
