import React, { useState } from 'react'
import type { SidebarPanelEntry } from '../core/registry'
import { useWorkspace } from '../context/WorkspaceContext'

interface SidebarProps {
    position: 'left' | 'right'
    panels: SidebarPanelEntry[]
    activePanel: string
    onPanelSelect: (id: string) => void
    isOpen: boolean
    onOpenSettings?: () => void
    showWorkspace?: boolean
}

function SettingsGearIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path d="M16.2 12.2a1.4 1.4 0 00.28 1.54l.05.05a1.7 1.7 0 11-2.4 2.4l-.05-.05a1.4 1.4 0 00-1.54-.28 1.4 1.4 0 00-.85 1.28v.14a1.7 1.7 0 11-3.4 0v-.07a1.4 1.4 0 00-.92-1.28 1.4 1.4 0 00-1.54.28l-.05.05a1.7 1.7 0 11-2.4-2.4l.05-.05a1.4 1.4 0 00.28-1.54 1.4 1.4 0 00-1.28-.85h-.14a1.7 1.7 0 110-3.4h.07a1.4 1.4 0 001.28-.92 1.4 1.4 0 00-.28-1.54l-.05-.05a1.7 1.7 0 112.4-2.4l.05.05a1.4 1.4 0 001.54.28h.07a1.4 1.4 0 00.85-1.28v-.14a1.7 1.7 0 113.4 0v.07a1.4 1.4 0 00.85 1.28 1.4 1.4 0 001.54-.28l.05-.05a1.7 1.7 0 112.4 2.4l-.05.05a1.4 1.4 0 00-.28 1.54v.07a1.4 1.4 0 001.28.85h.14a1.7 1.7 0 110 3.4h-.07a1.4 1.4 0 00-1.28.85z" />
        </svg>
    )
}

function HelpIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="7" />
            <path d="M8 7.5a2 2 0 012.8-1.8 2 2 0 01.7 3.3c-.5.5-1 .8-1 1.5" />
            <circle cx="10.5" cy="13.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
    )
}

export function Sidebar({
    position,
    panels,
    activePanel,
    onPanelSelect,
    isOpen,
    onOpenSettings,
    showWorkspace
}: SidebarProps): React.ReactElement {
    const activeEntry = panels.find((p) => p.id === activePanel)
    const ActiveComponent = activeEntry?.component

    return (
        <div className={`sidebar sidebar-${position} ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* Icon strip */}
            <div className="sidebar-icons">
                {/* Workspace selector at top of left sidebar */}
                {showWorkspace && position === 'left' && <WorkspaceSelector />}

                <div className="sidebar-icons-top">
                    {panels.map((panel) => {
                        const Icon = panel.icon
                        return (
                            <button
                                key={panel.id}
                                className={`sidebar-icon-btn ${panel.id === activePanel && isOpen ? 'active' : ''}`}
                                onClick={() => onPanelSelect(panel.id)}
                                title={panel.label}
                            >
                                <Icon className="sidebar-icon" />
                            </button>
                        )
                    })}
                </div>

                {position === 'left' && onOpenSettings && (
                    <div className="sidebar-icons-bottom">
                        <button className="sidebar-icon-btn" onClick={() => {}} title="Help">
                            <HelpIcon className="sidebar-icon" />
                        </button>
                        <button className="sidebar-icon-btn" onClick={onOpenSettings} title="Settings">
                            <SettingsGearIcon className="sidebar-icon" />
                        </button>
                    </div>
                )}
            </div>

            {/* Panel content */}
            {isOpen && ActiveComponent && (
                <div className="sidebar-panel-content">
                    <ActiveComponent />
                </div>
            )}
        </div>
    )
}

// ── Workspace Selector ─────────────────────────────────────

function WorkspaceSelector(): React.ReactElement {
    const { workspaces, activeWorkspace, openWorkspace, createWorkspace } = useWorkspace()
    const [menuOpen, setMenuOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)

    const initial = activeWorkspace?.name?.charAt(0).toUpperCase() ?? '?'

    return (
        <div className="workspace-selector">
            <button
                className="workspace-selector-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                title={activeWorkspace?.name ?? 'Select workspace'}
            >
                <span className="workspace-selector-initial">{initial}</span>
            </button>

            {menuOpen && (
                <>
                    <div className="workspace-menu-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="workspace-menu">
                        <div className="workspace-menu-header">Workspaces</div>
                        {workspaces.map((ws) => (
                            <button
                                key={ws.id}
                                className={`workspace-menu-item ${ws.id === activeWorkspace?.id ? 'active' : ''}`}
                                onClick={() => { openWorkspace(ws.id); setMenuOpen(false) }}
                            >
                                <span className="workspace-menu-initial">{ws.name.charAt(0).toUpperCase()}</span>
                                <span>{ws.name}</span>
                            </button>
                        ))}
                        <button
                            className="workspace-menu-item workspace-menu-add"
                            onClick={() => { setMenuOpen(false); setShowCreate(true) }}
                        >
                            <span className="workspace-menu-initial">+</span>
                            <span>New workspace</span>
                        </button>
                    </div>
                </>
            )}

            {showCreate && (
                <CreateWorkspaceModal
                    onClose={() => setShowCreate(false)}
                    onCreate={async (name, paths) => {
                        const ws = await createWorkspace(name, paths)
                        await openWorkspace(ws.id)
                        setShowCreate(false)
                    }}
                />
            )}
        </div>
    )
}

// ── Create Workspace Modal ─────────────────────────────────

function CreateWorkspaceModal({
    onClose,
    onCreate
}: {
    onClose: () => void
    onCreate: (name: string, paths: string[]) => Promise<void>
}): React.ReactElement {
    const [name, setName] = useState('')
    const [projectPath, setProjectPath] = useState('')
    const [creating, setCreating] = useState(false)

    const handleBrowse = async () => {
        const path = await window.electron.dialog.openDirectory()
        if (path) {
            setProjectPath(path)
            if (!name) setName(path.split('/').pop() ?? '')
        }
    }

    const handleCreate = async () => {
        if (!name.trim() || !projectPath.trim()) return
        setCreating(true)
        try { await onCreate(name.trim(), [projectPath.trim()]) }
        catch (e) { console.error('Failed to create workspace:', e) }
        setCreating(false)
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="create-workspace-modal" onClick={(e) => e.stopPropagation()}>
                <h2>New Workspace</h2>
                <div className="form-field">
                    <label>Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Project" autoFocus />
                </div>
                <div className="form-field">
                    <label>Project folder</label>
                    <div className="form-field-row">
                        <input type="text" value={projectPath} onChange={(e) => setProjectPath(e.target.value)}
                            placeholder="/home/user/projects/my-project" className="form-field-path" />
                        <button className="form-btn-secondary" onClick={handleBrowse}>Browse</button>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="form-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="form-btn-primary" onClick={handleCreate}
                        disabled={!name.trim() || !projectPath.trim() || creating}>
                        {creating ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    )
}
