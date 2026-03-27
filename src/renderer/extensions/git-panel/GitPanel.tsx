import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'

export function GitIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="4" r="2" />
            <circle cx="10" cy="16" r="2" />
            <circle cx="16" cy="10" r="2" />
            <path d="M10 6v8M12 10h2" />
        </svg>
    )
}

interface GitStatus {
    branch: string
    files: { status: string; path: string }[]
}

export function GitPanel(): React.ReactElement {
    const { activeWorkspace } = useWorkspace()
    const [isRepo, setIsRepo] = useState(false)
    const [status, setStatus] = useState<GitStatus | null>(null)
    const [commitMsg, setCommitMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const cwd = activeWorkspace?.projectPaths?.[0]

    const refresh = useCallback(async () => {
        if (!cwd || !window.electron?.git) return
        const repo = await window.electron.git.isRepo(cwd)
        setIsRepo(repo)
        if (repo) {
            const s = await window.electron.git.status(cwd)
            setStatus(s)
        }
    }, [cwd])

    useEffect(() => { refresh() }, [refresh])

    if (!activeWorkspace) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Open a workspace to use git</p>
            </div>
        )
    }

    if (!isRepo) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Not a git repository</p>
            </div>
        )
    }

    if (!status) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Loading…</p>
            </div>
        )
    }

    const staged = status.files.filter((f) => 'MADRC'.includes(f.status[0]) && f.status[0] !== ' ' && f.status[0] !== '?')
    const unstaged = status.files.filter((f) => f.status[1] !== ' ' || f.status === '??')

    const handleStage = async (path: string) => {
        if (!cwd) return
        await window.electron.git.stage(cwd, [path])
        refresh()
    }

    const handleUnstage = async (path: string) => {
        if (!cwd) return
        await window.electron.git.unstage(cwd, [path])
        refresh()
    }

    const handleStageAll = async () => {
        if (!cwd) return
        await window.electron.git.stage(cwd, ['.'])
        refresh()
    }

    const handleCommit = async () => {
        if (!cwd || !commitMsg.trim() || staged.length === 0) return
        setLoading(true)
        await window.electron.git.commit(cwd, commitMsg.trim())
        setCommitMsg('')
        setLoading(false)
        refresh()
    }

    return (
        <div className="git-panel">
            <div className="git-branch">
                <span className="git-branch-icon">⎇</span>
                <span className="git-branch-name">{status.branch}</span>
            </div>

            {/* Staged changes */}
            <div className="git-section">
                <div className="git-section-header">
                    <span>Staged changes</span>
                    <span className="git-section-count">{staged.length}</span>
                </div>
                {staged.map((f) => (
                    <div key={f.path} className="git-file git-file-staged">
                        <span className="git-file-status">{f.status[0]}</span>
                        <span className="git-file-path">{f.path}</span>
                        <button className="git-file-action" onClick={() => handleUnstage(f.path)} title="Unstage">−</button>
                    </div>
                ))}
            </div>

            {/* Unstaged changes */}
            <div className="git-section">
                <div className="git-section-header">
                    <span>Changes</span>
                    <span className="git-section-count">{unstaged.length}</span>
                    {unstaged.length > 0 && (
                        <button className="git-stage-all" onClick={handleStageAll} title="Stage all">+</button>
                    )}
                </div>
                {unstaged.map((f) => (
                    <div key={f.path} className="git-file">
                        <span className="git-file-status">{f.status === '??' ? 'U' : f.status[1]}</span>
                        <span className="git-file-path">{f.path}</span>
                        <button className="git-file-action" onClick={() => handleStage(f.path)} title="Stage">+</button>
                    </div>
                ))}
            </div>

            {/* Commit */}
            {staged.length > 0 && (
                <div className="git-commit">
                    <input
                        type="text"
                        className="git-commit-input"
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommit() }}
                        placeholder="Commit message"
                    />
                    <button
                        className="git-commit-btn"
                        onClick={handleCommit}
                        disabled={!commitMsg.trim() || loading}
                    >
                        {loading ? '…' : 'Commit'}
                    </button>
                </div>
            )}

            {status.files.length === 0 && (
                <div className="panel-content">
                    <p className="panel-placeholder">Working tree clean</p>
                </div>
            )}
        </div>
    )
}
