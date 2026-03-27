import React from 'react'

export function FileBrowserIcon({ className }: { className?: string }): React.ReactElement {
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
            <path d="M3 4h5l2 2h7a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
    )
}

export function FileBrowserPanel(): React.ReactElement {
    return (
        <div className="file-browser-panel">
            <div className="panel-header">
                <h3>Files</h3>
            </div>
            <div className="panel-content">
                <p className="panel-placeholder">Open a workspace to browse files</p>
            </div>
        </div>
    )
}
