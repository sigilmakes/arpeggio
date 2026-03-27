import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'

type ThemeMode = 'light' | 'dark' | 'system'

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
}

export function AppearanceIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <circle cx="10" cy="10" r="4" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
        </svg>
    )
}

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
    {
        value: 'light',
        label: 'Light',
        description: 'Always use the light theme'
    },
    {
        value: 'dark',
        label: 'Dark',
        description: 'Always use the dark theme'
    },
    {
        value: 'system',
        label: 'Adapt to system',
        description: 'Automatically match your operating system setting'
    }
]

export function AppearanceSettings({
    getSetting,
    setSetting
}: SettingsTabProps): React.ReactElement {
    const [mode, setMode] = useState<ThemeMode>(() => getSetting<ThemeMode>('mode') ?? 'system')

    // Keep resolved theme label for display
    const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode))

    useEffect(() => {
        const newResolved = resolveTheme(mode)
        setResolved(newResolved)
        document.documentElement.setAttribute('data-theme', newResolved)
        setSetting('mode', mode)
    }, [mode, setSetting])

    // Listen for system changes when in system mode
    useEffect(() => {
        if (mode !== 'system') return
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            const r = resolveTheme('system')
            setResolved(r)
            document.documentElement.setAttribute('data-theme', r)
        }
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [mode])

    return (
        <div className="appearance-settings">
            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Theme</div>
                    <div className="setting-item-description">
                        Choose how Arpeggio looks.
                        {mode === 'system' && (
                            <span className="setting-item-hint">
                                {' '}Currently using <strong>{resolved}</strong> based on your system.
                            </span>
                        )}
                    </div>
                </div>
                <div className="setting-item-control">
                    <div className="theme-options">
                        {THEME_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`theme-option ${mode === option.value ? 'active' : ''}`}
                                onClick={() => setMode(option.value)}
                            >
                                <span className="theme-option-label">{option.label}</span>
                                <span className="theme-option-desc">{option.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
