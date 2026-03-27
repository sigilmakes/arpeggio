import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useRegistry } from '../../context/ExtensionContext'
import type { AgentConfig, AgentStatus } from '@shared/agent-types'

// Re-export so ChatContext picks up changes immediately

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

export function AgentManagerPanel(): React.ReactElement {
    const { activeWorkspace, reloadWorkspace } = useWorkspace()
    const registry = useRegistry()
    const [agents, setAgents] = useState<AgentConfig[]>([])
    const [showPicker, setShowPicker] = useState(false)

    const templates = registry.getAllAgentTemplates()

    // Load agents from workspace
    useEffect(() => {
        setAgents(activeWorkspace?.agents ?? [])
    }, [activeWorkspace])

    // Persist agents to workspace.json and reload so chat picks them up
    const persistAgents = useCallback(async (updated: AgentConfig[]) => {
        if (!activeWorkspace) return
        const homePath = await window.electron.app.getPath('home')
        const config = { ...activeWorkspace, agents: updated }
        await window.electron.fs.writeFile(
            `${homePath}/.arpeggio/workspaces/${activeWorkspace.id}/workspace.json`,
            JSON.stringify(config, null, 4)
        )
        await reloadWorkspace()
    }, [activeWorkspace, reloadWorkspace])

    const addAgent = useCallback(async (templateId: string) => {
        const template = templates.find((t) => t.id === templateId)
        if (!template) return

        const agent: AgentConfig = {
            id: `${templateId}-${Date.now()}`,
            name: template.displayName,
            template: templateId,
            adapter: template.adapter,
            config: { ...template.defaults },
            status: 'inactive'
        }

        const updated = [...agents, agent]
        setAgents(updated)
        await persistAgents(updated)
        setShowPicker(false)
    }, [agents, templates, persistAgents])

    const removeAgent = useCallback(async (id: string) => {
        const updated = agents.filter((a) => a.id !== id)
        setAgents(updated)
        await persistAgents(updated)
    }, [agents, persistAgents])

    if (!activeWorkspace) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Open a workspace to manage agents</p>
            </div>
        )
    }

    return (
        <div className="agent-panel">
            {/* Agent list */}
            <div className="agent-list">
                {agents.map((agent) => (
                    <div key={agent.id} className="agent-row">
                        <span className="agent-status-dot" style={{ background: STATUS_COLORS[agent.status || 'inactive'] }} />
                        <div className="agent-row-info">
                            <span className="agent-row-name">{agent.name}</span>
                            <span className="agent-row-adapter">{agent.adapter}</span>
                        </div>
                        <button
                            className="agent-row-remove"
                            onClick={() => removeAgent(agent.id)}
                            title="Remove agent"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {agents.length === 0 && !showPicker && (
                <div className="panel-content">
                    <p className="panel-placeholder">No agents yet</p>
                </div>
            )}

            {/* Template picker — one click to add */}
            {showPicker ? (
                <div className="agent-picker">
                    <div className="agent-picker-header">Add agent</div>
                    {templates.map((t) => {
                        const alreadyAdded = agents.some((a) => a.template === t.id)
                        return (
                            <button
                                key={t.id}
                                className={`agent-picker-item ${alreadyAdded ? 'added' : ''}`}
                                onClick={() => !alreadyAdded && addAgent(t.id)}
                                disabled={alreadyAdded}
                            >
                                <div className="agent-picker-item-info">
                                    <span className="agent-picker-item-name">{t.displayName}</span>
                                    <span className="agent-picker-item-adapter">{t.adapter}</span>
                                </div>
                                {alreadyAdded && <span className="agent-picker-item-check">✓</span>}
                            </button>
                        )
                    })}
                    <button className="agent-picker-cancel" onClick={() => setShowPicker(false)}>
                        Cancel
                    </button>
                </div>
            ) : (
                <div style={{ padding: '4px 10px' }}>
                    <button className="panel-action-btn" onClick={() => setShowPicker(true)}>
                        + Add Agent
                    </button>
                </div>
            )}
        </div>
    )
}
