import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function PdfViewerSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
            <path d="M12 2v4h4" />
            <text x="5" y="14" fontSize="5" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
        </svg>
    )
}

export function PdfViewerSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [defaultZoom, setDefaultZoom] = useState(() => getSetting<number>('defaultZoom') ?? 100)

    useEffect(() => { setSetting('defaultZoom', defaultZoom) }, [defaultZoom, setSetting])

    return (
        <div>
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Default zoom</div>
                    <div className="setting-item-description">Initial zoom level when opening a PDF.</div>
                </div>
                <div className="setting-item-control">
                    <select value={defaultZoom} onChange={(e) => setDefaultZoom(Number(e.target.value))} className="setting-select">
                        <option value={50}>50%</option>
                        <option value={75}>75%</option>
                        <option value={100}>100%</option>
                        <option value={125}>125%</option>
                        <option value={150}>150%</option>
                        <option value={200}>200%</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
