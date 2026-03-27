import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function MarkdownSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="16" height="14" rx="1" />
            <path d="M5 13V7l2.5 3L10 7v6M13 10h2l-1.5-3L12 10h0" />
        </svg>
    )
}

export function MarkdownSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [fontSize, setFontSize] = useState(() => getSetting<number>('fontSize') ?? 16)
    const [lineWidth, setLineWidth] = useState(() => getSetting<number>('lineWidth') ?? 800)
    const [spellcheck, setSpellcheck] = useState(() => getSetting<boolean>('spellcheck') ?? true)

    useEffect(() => { setSetting('fontSize', fontSize) }, [fontSize, setSetting])
    useEffect(() => { setSetting('lineWidth', lineWidth) }, [lineWidth, setSetting])
    useEffect(() => { setSetting('spellcheck', spellcheck) }, [spellcheck, setSetting])

    return (
        <div className="markdown-settings">
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Font size</div>
                    <div className="setting-item-description">
                        Font size for the editor in pixels.
                    </div>
                </div>
                <div className="setting-item-control">
                    <input
                        type="range"
                        min="12"
                        max="24"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="setting-slider"
                    />
                    <span className="setting-value">{fontSize}px</span>
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Readable line width</div>
                    <div className="setting-item-description">
                        Maximum width of the editor content area in pixels.
                    </div>
                </div>
                <div className="setting-item-control">
                    <input
                        type="range"
                        min="500"
                        max="1200"
                        step="50"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="setting-slider"
                    />
                    <span className="setting-value">{lineWidth}px</span>
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Spellcheck</div>
                    <div className="setting-item-description">
                        Enable browser spellcheck in the editor.
                    </div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={spellcheck} onChange={setSpellcheck} />
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
