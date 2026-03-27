import React, { useState, useEffect, useCallback, useRef } from 'react'
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

interface GitLogEntry {
    hash: string
    short: string
    subject: string
    author: string
    date: string
}

interface GitStatus {
    branch: string
    files: { status: string; path: string }[]
}

const POLL_INTERVAL = 3000 // Poll every 3 seconds for external changes

interface GitBranch {
    name: string
    current: boolean
}

export function GitPanel(): React.ReactElement {
    const { activeWorkspace, openFile } = useWorkspace()
    const [isRepo, setIsRepo] = useState(false)
    const [status, setStatus] = useState<GitStatus | null>(null)
    const [log, setLog] = useState<GitLogEntry[]>([])
    const [branches, setBranches] = useState<GitBranch[]>([])
    const [commitMsg, setCommitMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState<'changes' | 'history' | 'branches'>('changes')
    const cwd = activeWorkspace?.projectPaths?.[0]
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const refresh = useCallback(async () => {
        if (!cwd || !window.electron?.git) return
        const repo = await window.electron.git.isRepo(cwd)
        setIsRepo(repo)
        if (repo) {
            const s = await window.electron.git.status(cwd)
            setStatus(s)
            const l = await window.electron.git.log(cwd, 50)
            setLog(l)
            const b = await window.electron.git.branches(cwd)
            setBranches(b)
        }
    }, [cwd])

    // Initial load + polling for external changes
    useEffect(() => {
        refresh()
        pollRef.current = setInterval(refresh, POLL_INTERVAL)
        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [refresh])

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
                <button className="git-refresh-btn" onClick={refresh} title="Refresh">↻</button>
            </div>

            {/* Tab switcher */}
            <div className="git-tabs">
                <button className={`git-tab ${tab === 'changes' ? 'active' : ''}`} onClick={() => setTab('changes')}>
                    Changes{status.files.length > 0 ? ` (${status.files.length})` : ''}
                </button>
                <button className={`git-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                    History
                </button>
                <button className={`git-tab ${tab === 'branches' ? 'active' : ''}`} onClick={() => setTab('branches')}>
                    Branches{branches.length > 0 ? ` (${branches.length})` : ''}
                </button>
            </div>

            {tab === 'changes' && (
                <div className="git-changes">
                    {/* Staged changes */}
                    {staged.length > 0 && (
                        <div className="git-section">
                            <div className="git-section-header">
                                <span>Staged</span>
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
                    )}

                    {/* Unstaged changes */}
                    {unstaged.length > 0 && (
                        <div className="git-section">
                            <div className="git-section-header">
                                <span>Changes</span>
                                <span className="git-section-count">{unstaged.length}</span>
                                <button className="git-stage-all" onClick={handleStageAll} title="Stage all">+</button>
                            </div>
                            {unstaged.map((f) => (
                                <div key={f.path} className="git-file">
                                    <span className="git-file-status">{f.status === '??' ? 'U' : f.status[1]}</span>
                                    <span className="git-file-path">{f.path}</span>
                                    <button className="git-file-action" onClick={() => handleStage(f.path)} title="Stage">+</button>
                                </div>
                            ))}
                        </div>
                    )}

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
                            <button className="git-commit-btn" onClick={handleCommit} disabled={!commitMsg.trim() || loading}>
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
            )}

            {tab === 'history' && (
                <div className="git-history">
                    {log.length === 0 ? (
                        <div className="panel-content">
                            <p className="panel-placeholder">No commits yet</p>
                        </div>
                    ) : (
                        log.map((entry) => (
                            <div
                                key={entry.hash}
                                className="git-log-entry"
                                onClick={() => openFile(`diff://${entry.hash}`)}
                                title="View diff"
                            >
                                <div className="git-log-subject">{entry.subject}</div>
                                <div className="git-log-meta">
                                    <span className="git-log-hash">{entry.short}</span>
                                    <span className="git-log-author">{entry.author}</span>
                                    <span className="git-log-date">{formatRelativeDate(entry.date)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'branches' && (
                <div className="git-branches">
                    {branches.length === 0 ? (
                        <div className="panel-content">
                            <p className="panel-placeholder">No branches</p>
                        </div>
                    ) : (
                        <>
                            {/* Local branches */}
                            <div className="git-section">
                                <div className="git-section-header"><span>Local</span></div>
                                {branches.filter((b) => !b.name.startsWith('origin/')).map((b) => (
                                    <div
                                        key={b.name}
                                        className={`git-branch-item ${b.current ? 'current' : ''}`}
                                        onClick={async () => {
                                            if (!b.current && cwd) {
                                                await window.electron.git.checkout(cwd, b.name)
                                                refresh()
                                            }
                                        }}
                                    >
                                        <span className="git-branch-item-icon">{b.current ? '●' : '○'}</span>
                                        <span className="git-branch-item-name">{b.name}</span>
                                        {b.current && <span className="git-branch-item-tag">HEAD</span>}
                                    </div>
                                ))}
                            </div>

                            {/* Remote branches */}
                            {branches.some((b) => b.name.startsWith('origin/')) && (
                                <div className="git-section">
                                    <div className="git-section-header"><span>Remote</span></div>
                                    {branches.filter((b) => b.name.startsWith('origin/')).map((b) => (
                                        <div key={b.name} className="git-branch-item remote">
                                            <span className="git-branch-item-icon">○</span>
                                            <span className="git-branch-item-name">{b.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}
