import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useRegistry } from '../../context/ExtensionContext'
import { getAgentStats, onStatsChange, type AgentStats } from '../../core/agent-stats'
import type { AgentConfig, AgentStatus } from '@shared/agent-types'

export function AgentManagerIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="7" r="3" />
            <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
    )
}

export function AgentManagerPanel(): React.ReactElement {
    const { activeWorkspace, reloadWorkspace } = useWorkspace()
    const registry = useRegistry()
    const [agents, setAgents] = useState<AgentConfig[]>([])
    const [showPicker, setShowPicker] = useState(false)
    const [, forceUpdate] = useState(0)

    const templates = registry.getAllAgentTemplates()

    useEffect(() => {
        setAgents(activeWorkspace?.agents ?? [])
    }, [activeWorkspace])

    // Re-render when stats change
    useEffect(() => {
        return onStatsChange(() => forceUpdate((n) => n + 1))
    }, [])

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
            <div className="agent-list">
                {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} onRemove={() => removeAgent(agent.id)} />
                ))}
            </div>

            {agents.length === 0 && !showPicker && (
                <div className="panel-content">
                    <p className="panel-placeholder">No agents yet</p>
                </div>
            )}

            {showPicker ? (
                <div className="agent-picker">
                    <div className="agent-picker-header">Add agent</div>
                    {templates.map((t) => {
                        const alreadyAdded = agents.some((a) => a.template === t.id)
                        return (
                            <button key={t.id} className={`agent-picker-item ${alreadyAdded ? 'added' : ''}`}
                                onClick={() => !alreadyAdded && addAgent(t.id)} disabled={alreadyAdded}>
                                <div className="agent-picker-item-info">
                                    <span className="agent-picker-item-name">{t.displayName}</span>
                                    <span className="agent-picker-item-adapter">{t.adapter}</span>
                                </div>
                                {alreadyAdded && <span className="agent-picker-item-check">✓</span>}
                            </button>
                        )
                    })}
                    <button className="agent-picker-cancel" onClick={() => setShowPicker(false)}>Cancel</button>
                </div>
            ) : (
                <div style={{ padding: '4px 10px' }}>
                    <button className="panel-action-btn" onClick={() => setShowPicker(true)}>+ Add Agent</button>
                </div>
            )}
        </div>
    )
}

// ── Agent Card ─────────────────────────────────────────────

function AgentCard({ agent, onRemove }: { agent: AgentConfig; onRemove: () => void }): React.ReactElement {
    const stats = getAgentStats(agent.id)
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="agent-card">
            <div className="agent-card-header" onClick={() => setExpanded(!expanded)}>
                <span className="agent-card-dot" data-status={stats ? 'active' : 'inactive'} />
                <div className="agent-card-title">
                    <span className="agent-card-name">{agent.name}</span>
                    {stats?.model && (
                        <span className="agent-card-model">{stats.model}</span>
                    )}
                    {!stats?.model && (
                        <span className="agent-card-adapter">{agent.adapter}</span>
                    )}
                </div>
                <button className="agent-card-remove" onClick={(e) => { e.stopPropagation(); onRemove() }} title="Remove">✕</button>
            </div>

            {expanded && (
                <div className="agent-card-details">
                    <div className="agent-card-row">
                        <span className="agent-card-label">Adapter</span>
                        <span className="agent-card-value">{agent.adapter}</span>
                    </div>
                    {stats?.model && (
                        <div className="agent-card-row">
                            <span className="agent-card-label">Model</span>
                            <span className="agent-card-value">{stats.model}</span>
                        </div>
                    )}
                    {stats && (
                        <>
                            <div className="agent-card-row">
                                <span className="agent-card-label">Tokens</span>
                                <span className="agent-card-value">
                                    {formatNum(stats.inputTokens)} in / {formatNum(stats.outputTokens)} out
                                </span>
                            </div>
                            <div className="agent-card-row">
                                <span className="agent-card-label">Context</span>
                                <span className="agent-card-value">{formatNum(stats.contextUsed)} tokens</span>
                            </div>
                            <div className="agent-card-row">
                                <span className="agent-card-label">Cost</span>
                                <span className="agent-card-value">${stats.cost.toFixed(4)}</span>
                            </div>
                        </>
                    )}
                    {!stats && (
                        <div className="agent-card-row">
                            <span className="agent-card-label" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                No activity yet — send a message
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function formatNum(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
}
