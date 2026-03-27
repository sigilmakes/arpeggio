import React from 'react'

export function Titlebar(): React.ReactElement {
    const isLinux = navigator.platform.includes('Linux')
    const isMac = navigator.platform.includes('Mac')

    // macOS uses native traffic lights via titleBarStyle: 'hidden'
    // Linux/Windows need custom window controls
    const showControls = !isMac

    return (
        <div className="titlebar">
            <div className="titlebar-drag" />
            {showControls && (
                <div className="titlebar-controls">
                    <button
                        className="titlebar-btn"
                        onClick={() => window.electron?.window.minimize()}
                        title="Minimize"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        className="titlebar-btn"
                        onClick={() => window.electron?.window.maximize()}
                        title="Maximize"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                        </svg>
                    </button>
                    <button
                        className="titlebar-btn titlebar-btn-close"
                        onClick={() => window.electron?.window.close()}
                        title="Close"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}
