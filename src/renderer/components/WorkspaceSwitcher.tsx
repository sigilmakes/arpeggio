import React, { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'

export function WorkspaceSwitcher(): React.ReactElement {
    const { workspaces, activeWorkspace, openWorkspace, createWorkspace } = useWorkspace()
    const [showCreate, setShowCreate] = useState(false)

    return (
        <div className="workspace-switcher">
            <div className="workspace-switcher-list">
                {workspaces.map((ws) => (
                    <button
                        key={ws.id}
                        className={`workspace-switcher-item ${ws.id === activeWorkspace?.id ? 'active' : ''}`}
                        onClick={() => openWorkspace(ws.id)}
                        title={ws.name}
                    >
                        <span className="workspace-switcher-initial">
                            {ws.name.charAt(0).toUpperCase()}
                        </span>
                    </button>
                ))}
            </div>
            <div className="workspace-switcher-bottom">
                <button
                    className="workspace-switcher-add"
                    onClick={() => setShowCreate(true)}
                    title="Create workspace"
                >
                    +
                </button>
            </div>

            {showCreate && (
                <CreateWorkspaceModal
                    onClose={() => setShowCreate(false)}
                    onCreate={async (name, projectPaths) => {
                        const ws = await createWorkspace(name, projectPaths)
                        await openWorkspace(ws.id)
                        setShowCreate(false)
                    }}
                />
            )}
        </div>
    )
}

// ── Create Workspace Modal ─────────────────────────────────

interface CreateWorkspaceModalProps {
    onClose: () => void
    onCreate: (name: string, projectPaths: string[]) => Promise<void>
}

function CreateWorkspaceModal({ onClose, onCreate }: CreateWorkspaceModalProps): React.ReactElement {
    const [name, setName] = useState('')
    const [projectPath, setProjectPath] = useState('')
    const [creating, setCreating] = useState(false)

    const handleBrowse = async () => {
        const path = await window.electron.dialog.openDirectory()
        if (path) {
            setProjectPath(path)
            // Auto-fill name from directory name if empty
            if (!name) {
                const dirName = path.split('/').pop() ?? ''
                setName(dirName)
            }
        }
    }

    const handleCreate = async () => {
        if (!name.trim() || !projectPath.trim()) return
        setCreating(true)
        try {
            await onCreate(name.trim(), [projectPath.trim()])
        } catch (error) {
            console.error('Failed to create workspace:', error)
        }
        setCreating(false)
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="create-workspace-modal" onClick={(e) => e.stopPropagation()}>
                <h2>New Workspace</h2>

                <div className="form-field">
                    <label>Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Project"
                        autoFocus
                    />
                </div>

                <div className="form-field">
                    <label>Project folder</label>
                    <div className="form-field-row">
                        <input
                            type="text"
                            value={projectPath}
                            onChange={(e) => setProjectPath(e.target.value)}
                            placeholder="/home/user/projects/my-project"
                            className="form-field-path"
                        />
                        <button className="form-btn-secondary" onClick={handleBrowse}>
                            Browse
                        </button>
                    </div>
                </div>

                <div className="form-actions">
                    <button className="form-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="form-btn-primary"
                        onClick={handleCreate}
                        disabled={!name.trim() || !projectPath.trim() || creating}
                    >
                        {creating ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    )
}
