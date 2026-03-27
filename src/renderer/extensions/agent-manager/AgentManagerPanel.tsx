import React from 'react'

export function AgentManagerIcon({ className }: { className?: string }): React.ReactElement {
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
            <circle cx="10" cy="7" r="3" />
            <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
    )
}

export function AgentManagerPanel(): React.ReactElement {
    return (
        <div className="agent-manager-panel">
            <div className="panel-header">
                <h3>Agents</h3>
            </div>
            <div className="panel-content">
                <p className="panel-placeholder">No agents configured</p>
                <button className="panel-action-btn">+ New Agent</button>
            </div>
        </div>
    )
}
