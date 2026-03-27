import React from 'react'

export function ChatChannelsIcon({ className }: { className?: string }): React.ReactElement {
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
            <path d="M4 4h12a2 2 0 012 2v7a2 2 0 01-2 2H7l-3 3V6a2 2 0 012-2z" />
        </svg>
    )
}

export function ChatChannelsPanel(): React.ReactElement {
    return (
        <div className="chat-channels-panel">
            <div className="panel-header">
                <h3>Channels</h3>
            </div>
            <div className="panel-content">
                <p className="panel-placeholder">No channels yet</p>
                <button className="panel-action-btn">+ New Channel</button>
            </div>
        </div>
    )
}
