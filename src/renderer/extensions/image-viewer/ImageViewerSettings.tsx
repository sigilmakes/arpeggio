import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function ImageViewerSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <circle cx="7" cy="8" r="1.5" />
            <path d="M18 13l-4-4-6 6" />
        </svg>
    )
}

export function ImageViewerSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [background, setBackground] = useState(() => getSetting<string>('background') ?? 'checkered')
    const [fitMode, setFitMode] = useState(() => getSetting<string>('fitMode') ?? 'contain')

    useEffect(() => { setSetting('background', background) }, [background, setSetting])
    useEffect(() => { setSetting('fitMode', fitMode) }, [fitMode, setSetting])

    return (
        <div>
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Background</div>
                    <div className="setting-item-description">Background pattern behind transparent images.</div>
                </div>
                <div className="setting-item-control">
                    <select value={background} onChange={(e) => setBackground(e.target.value)} className="setting-select">
                        <option value="checkered">Checkered</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                    </select>
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Default fit</div>
                    <div className="setting-item-description">How images are initially scaled.</div>
                </div>
                <div className="setting-item-control">
                    <select value={fitMode} onChange={(e) => setFitMode(e.target.value)} className="setting-select">
                        <option value="contain">Fit to view</option>
                        <option value="actual">Actual size</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
