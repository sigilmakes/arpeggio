import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

export function CodeEditorSettingsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 5L3 10l4 5M13 5l4 5-4 5" />
        </svg>
    )
}

export function CodeEditorSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const [fontSize, setFontSize] = useState(() => getSetting<number>('fontSize') ?? 14)
    const [tabSize, setTabSize] = useState(() => getSetting<number>('tabSize') ?? 4)
    const [wordWrap, setWordWrap] = useState(() => getSetting<boolean>('wordWrap') ?? true)
    const [lineNumbers, setLineNumbers] = useState(() => getSetting<boolean>('lineNumbers') ?? true)
    const [minimap, setMinimap] = useState(() => getSetting<boolean>('minimap') ?? false)
    const [bracketColors, setBracketColors] = useState(() => getSetting<boolean>('bracketColors') ?? true)

    useEffect(() => { setSetting('fontSize', fontSize) }, [fontSize, setSetting])
    useEffect(() => { setSetting('tabSize', tabSize) }, [tabSize, setSetting])
    useEffect(() => { setSetting('wordWrap', wordWrap) }, [wordWrap, setSetting])
    useEffect(() => { setSetting('lineNumbers', lineNumbers) }, [lineNumbers, setSetting])
    useEffect(() => { setSetting('minimap', minimap) }, [minimap, setSetting])
    useEffect(() => { setSetting('bracketColors', bracketColors) }, [bracketColors, setSetting])

    return (
        <div>
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Font size</div>
                    <div className="setting-item-description">Font size for code in pixels.</div>
                </div>
                <div className="setting-item-control">
                    <input type="range" min="10" max="24" value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))} className="setting-slider" />
                    <span className="setting-value">{fontSize}px</span>
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Tab size</div>
                    <div className="setting-item-description">Number of spaces per indentation level.</div>
                </div>
                <div className="setting-item-control">
                    <select value={tabSize} onChange={(e) => setTabSize(Number(e.target.value))} className="setting-select">
                        <option value={2}>2 spaces</option>
                        <option value={4}>4 spaces</option>
                        <option value={8}>8 spaces</option>
                    </select>
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Word wrap</div>
                    <div className="setting-item-description">Wrap long lines to fit the editor width.</div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={wordWrap} onChange={setWordWrap} />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Line numbers</div>
                    <div className="setting-item-description">Show line numbers in the gutter.</div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={lineNumbers} onChange={setLineNumbers} />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Minimap</div>
                    <div className="setting-item-description">Show a minimap of the code on the right side.</div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={minimap} onChange={setMinimap} />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Bracket pair colorization</div>
                    <div className="setting-item-description">Color matching brackets for easier reading.</div>
                </div>
                <div className="setting-item-control">
                    <ToggleSwitch checked={bracketColors} onChange={setBracketColors} />
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
