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

    const addAgent = useCallback(async (templateId: string, extraConfig?: Record<string, unknown>, customName?: string) => {
        const template = templates.find((t) => t.id === templateId)
        if (!template) return
        const agent: AgentConfig = {
            id: `${templateId}-${Date.now()}`,
            name: customName || template.displayName,
            template: templateId,
            adapter: template.adapter,
            config: { ...template.defaults, ...extraConfig },
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

    const updateAgent = useCallback(async (id: string, changes: Partial<AgentConfig>) => {
        const updated = agents.map((a) => a.id === id ? { ...a, ...changes } : a)
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
                    <AgentCard key={agent.id} agent={agent} onRemove={() => removeAgent(agent.id)} onUpdate={(changes) => updateAgent(agent.id, changes)} />
                ))}
            </div>

            {agents.length === 0 && !showPicker && (
                <div className="panel-content">
                    <p className="panel-placeholder">No agents yet</p>
                </div>
            )}

            {showPicker ? (
                <AgentPicker
                    templates={templates}
                    onAdd={addAgent}
                    onCancel={() => setShowPicker(false)}
                />
            ) : (
                <div style={{ padding: '4px 10px' }}>
                    <button className="panel-action-btn" onClick={() => setShowPicker(true)}>+ Add Agent</button>
                </div>
            )}
        </div>
    )
}

// ── Agent Card ─────────────────────────────────────────────

function AgentCard({ agent, onRemove, onUpdate }: {
    agent: AgentConfig; onRemove: () => void; onUpdate: (changes: Partial<AgentConfig>) => void
}): React.ReactElement {
    const stats = getAgentStats(agent.id)
    const [expanded, setExpanded] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState(agent.name)
    const [models, setModels] = useState<PiModel[]>([])
    const [loadingModels, setLoadingModels] = useState(false)
    const isPi = agent.adapter === 'json-stdio'

    // Get current model from args
    const currentArgs = (agent.config.args as string[]) ?? []
    const modelIdx = currentArgs.indexOf('--model')
    const currentModel = modelIdx >= 0 ? currentArgs[modelIdx + 1] : ''

    // Load models when expanded for Pi agents
    useEffect(() => {
        if (!expanded || !isPi || models.length > 0) return
        setLoadingModels(true)
        window.electron?.pi?.listModels().then((list) => {
            setModels(list ?? [])
            setLoadingModels(false)
        }).catch(() => setLoadingModels(false))
    }, [expanded, isPi, models.length])

    const saveName = () => {
        if (nameValue.trim() && nameValue !== agent.name) {
            onUpdate({ name: nameValue.trim() })
        }
        setEditingName(false)
    }

    const changeModel = (modelId: string) => {
        const newArgs = ['--mode', 'rpc', '--model', modelId]
        onUpdate({ config: { ...agent.config, args: newArgs } })
        // Clear adapter cache so next message spawns a new process with new model
        // (import would be circular, so we just clear by agent id convention)
        if (typeof window !== 'undefined') {
            (window as any).__adapterCacheClear?.(agent.id)
        }
    }

    return (
        <div className="agent-card">
            <div className="agent-card-header" onClick={() => setExpanded(!expanded)}>
                <span className="agent-card-dot" data-status={stats ? 'active' : 'inactive'} />
                <div className="agent-card-title">
                    {editingName ? (
                        <input
                            className="agent-card-name-input"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(agent.name); setEditingName(false) } }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <span className="agent-card-name" onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true) }}>
                            {agent.name}
                        </span>
                    )}
                    {stats?.model && <span className="agent-card-model">{stats.model}</span>}
                    {!stats?.model && currentModel && <span className="agent-card-model">{currentModel}</span>}
                    {!stats?.model && !currentModel && <span className="agent-card-adapter">{agent.adapter}</span>}
                </div>
                <button className="agent-card-remove" onClick={(e) => { e.stopPropagation(); onRemove() }} title="Remove">✕</button>
            </div>

            {expanded && (
                <div className="agent-card-details">
                    <div className="agent-card-row">
                        <span className="agent-card-label">Adapter</span>
                        <span className="agent-card-value">{agent.adapter}</span>
                    </div>

                    {/* Model selector for Pi agents */}
                    {isPi && (
                        <div className="agent-card-model-row">
                            <span className="agent-card-label">Model</span>
                            {loadingModels ? (
                                <span className="agent-card-value" style={{ fontStyle: 'italic' }}>Loading…</span>
                            ) : (
                                <select
                                    className="agent-card-model-select"
                                    value={currentModel}
                                    onChange={(e) => changeModel(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {!currentModel && <option value="">Default</option>}
                                    {models.map((m) => {
                                        const id = `${m.provider}/${m.model}`
                                        return <option key={id} value={id}>{m.model} ({m.context}{m.thinking ? ' 💭' : ''})</option>
                                    })}
                                </select>
                            )}
                        </div>
                    )}

                    {stats && (
                        <>
                            <div className="agent-card-row">
                                <span className="agent-card-label">Tokens</span>
                                <span className="agent-card-value">{formatNum(stats.inputTokens)} in / {formatNum(stats.outputTokens)} out</span>
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
                            <span className="agent-card-label" style={{ fontStyle: 'italic' }}>No activity yet</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Agent Picker ───────────────────────────────────────────

interface PiModel {
    provider: string
    model: string
    context: string
    maxOut: string
    thinking: boolean
    images: boolean
}

interface AgentPickerProps {
    templates: { id: string; displayName: string; adapter: string }[]
    onAdd: (templateId: string, extraConfig?: Record<string, unknown>, customName?: string) => Promise<void>
    onCancel: () => void
}

function AgentPicker({ templates, onAdd, onCancel }: AgentPickerProps): React.ReactElement {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
    const [models, setModels] = useState<PiModel[]>([])
    const [selectedModel, setSelectedModel] = useState('')
    const [customName, setCustomName] = useState('')
    const [loadingModels, setLoadingModels] = useState(false)

    const template = templates.find((t) => t.id === selectedTemplate)
    const isPi = selectedTemplate === 'pi'

    // Load models when Pi is selected
    useEffect(() => {
        if (!isPi) return
        setLoadingModels(true)
        window.electron?.pi?.listModels().then((list) => {
            setModels(list ?? [])
            if (list.length > 0) setSelectedModel(`${list[0].provider}/${list[0].model}`)
            setLoadingModels(false)
        }).catch(() => setLoadingModels(false))
    }, [isPi])

    const handleAdd = () => {
        if (!selectedTemplate) return
        const extra: Record<string, unknown> = {}
        if (isPi && selectedModel) {
            extra.args = ['--mode', 'rpc', '--model', selectedModel]
        }
        const modelLabel = models.find((m) => `${m.provider}/${m.model}` === selectedModel)
        const name = customName.trim() || (isPi && modelLabel ? `Pi (${modelLabel.model})` : undefined)
        onAdd(selectedTemplate, extra, name)
    }

    if (selectedTemplate) {
        return (
            <div className="agent-picker">
                <div className="agent-picker-header">{template?.displayName ?? selectedTemplate}</div>

                <div className="agent-picker-form">
                    <div className="agent-picker-field">
                        <label>Name</label>
                        <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                            placeholder={template?.displayName} className="agent-picker-input" />
                    </div>

                    {isPi && (
                        <div className="agent-picker-field">
                            <label>Model</label>
                            {loadingModels ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 0' }}>Loading models…</div>
                            ) : (
                                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="agent-picker-select">
                                    {models.map((m) => {
                                        const id = `${m.provider}/${m.model}`
                                        const badges = [m.context, m.thinking ? '💭' : '', m.images ? '🖼' : ''].filter(Boolean).join(' ')
                                        return (
                                            <option key={id} value={id}>
                                                {m.provider}/{m.model} — {badges}
                                            </option>
                                        )
                                    })}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="agent-picker-form-actions">
                        <button className="form-btn-secondary" onClick={() => setSelectedTemplate(null)} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Back</button>
                        <button className="form-btn-primary" onClick={handleAdd} disabled={isPi && !selectedModel} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>Add</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="agent-picker">
            <div className="agent-picker-header">Add agent</div>
            {templates.map((t) => (
                <button key={t.id} className="agent-picker-item" onClick={() => setSelectedTemplate(t.id)}>
                    <div className="agent-picker-item-info">
                        <span className="agent-picker-item-name">{t.displayName}</span>
                        <span className="agent-picker-item-adapter">{t.adapter}</span>
                    </div>
                </button>
            ))}
            <button className="agent-picker-cancel" onClick={onCancel}>Cancel</button>
        </div>
    )
}

function formatNum(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
}
