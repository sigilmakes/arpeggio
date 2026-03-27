import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useChat } from '../../context/ChatContext'
import type { AgentConfig, AgentStatus } from '@shared/agent-types'

export function AgentManagerIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="7" r="3" />
            <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
    )
}

const STATUS_COLORS: Record<AgentStatus, string> = {
    available: '#7fa892',
    connecting: '#d4a843',
    active: '#5b7a6b',
    error: '#c45c5c',
    inactive: '#6b6560'
}

const STATUS_LABELS: Record<AgentStatus, string> = {
    available: 'Available',
    connecting: 'Connecting…',
    active: 'Active',
    error: 'Error',
    inactive: 'Inactive'
}

export function AgentManagerPanel(): React.ReactElement {
    const { activeWorkspace } = useWorkspace()
    const [agents, setAgents] = useState<AgentConfig[]>([])
    const [showAdd, setShowAdd] = useState(false)

    useEffect(() => {
        if (activeWorkspace) {
            setAgents(activeWorkspace.agents ?? [])
        } else {
            setAgents([])
        }
    }, [activeWorkspace])

    if (!activeWorkspace) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Open a workspace to manage agents</p>
            </div>
        )
    }

    return (
        <div className="agent-panel">
            {agents.length === 0 && !showAdd && (
                <div className="panel-content">
                    <p className="panel-placeholder">No agents configured</p>
                </div>
            )}

            <div className="agent-list">
                {agents.map((agent) => (
                    <AgentRow key={agent.id} agent={agent} />
                ))}
            </div>

            {showAdd ? (
                <AddAgentForm
                    onAdd={(agent) => {
                        setAgents((prev) => [...prev, agent])
                        setShowAdd(false)
                    }}
                    onCancel={() => setShowAdd(false)}
                />
            ) : (
                <div style={{ padding: '4px 10px' }}>
                    <button className="panel-action-btn" onClick={() => setShowAdd(true)}>
                        + New Agent
                    </button>
                </div>
            )}
        </div>
    )
}

function AgentRow({ agent }: { agent: AgentConfig }): React.ReactElement {
    const status = agent.status || 'inactive'
    return (
        <div className="agent-row">
            <span className="agent-status-dot" style={{ background: STATUS_COLORS[status] }} />
            <div className="agent-row-info">
                <span className="agent-row-name">{agent.name}</span>
                <span className="agent-row-status">{STATUS_LABELS[status]}</span>
            </div>
            <span className="agent-row-adapter">{agent.adapter}</span>
        </div>
    )
}

function AddAgentForm({ onAdd, onCancel }: { onAdd: (a: AgentConfig) => void; onCancel: () => void }): React.ReactElement {
    const [name, setName] = useState('')
    const [adapter, setAdapter] = useState('echo')

    const handleAdd = () => {
        if (!name.trim()) return
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now()}`
        onAdd({
            id,
            name: name.trim(),
            template: adapter,
            adapter,
            config: {},
            status: 'inactive'
        })
    }

    return (
        <div className="agent-add-form">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name"
                className="agent-add-input"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel() }}
            />
            <select value={adapter} onChange={(e) => setAdapter(e.target.value)} className="agent-add-select">
                <option value="echo">Echo (test)</option>
                <option value="stdio">STDIO</option>
                <option value="http">HTTP</option>
                <option value="acp">ACP</option>
            </select>
            <div className="agent-add-actions">
                <button className="form-btn-secondary" onClick={onCancel} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Cancel</button>
                <button className="form-btn-primary" onClick={handleAdd} disabled={!name.trim()} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Add</button>
            </div>
        </div>
    )
}
