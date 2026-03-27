import React, { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('arpeggio-theme') as Theme | null
        if (stored) return stored
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    }
    return 'light'
}

export function ThemeToggle(): React.ReactElement {
    const [theme, setTheme] = useState<Theme>(getInitialTheme)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('arpeggio-theme', theme)
    }, [theme])

    const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

    return (
        <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    )
}
