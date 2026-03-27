import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function FileBrowserSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h5l2 2h7a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
    )
}

export function FileBrowserSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [showHidden, setShowHidden] = useState(() => getSetting<boolean>('showHidden') ?? false)
    const [excludePatterns, setExcludePatterns] = useState(
        () => getSetting<string>('excludePatterns') ?? '.git,node_modules,.next,__pycache__,.DS_Store,.vscode,.idea'
    )

    useEffect(() => { setSetting('showHidden', showHidden) }, [showHidden, setSetting])
    useEffect(() => { setSetting('excludePatterns', excludePatterns) }, [excludePatterns, setSetting])

    return (
        <div>
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Show hidden files</div>
                    <div className="setting-item-description">Show dotfiles (files starting with .) in the file browser.</div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={showHidden} onChange={setShowHidden} />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Excluded folders</div>
                    <div className="setting-item-description">
                        Comma-separated list of folder names to hide from the file browser.
                    </div>
                </div>
                <div className="setting-item-control">
                    <input
                        type="text"
                        value={excludePatterns}
                        onChange={(e) => setExcludePatterns(e.target.value)}
                        className="setting-text-input"
                        placeholder=".git,node_modules"
                    />
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
