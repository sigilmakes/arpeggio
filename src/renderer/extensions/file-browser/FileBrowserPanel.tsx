import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useSettingsStore } from '../../context/ExtensionContext'

const EXTENSION_ID = 'arpeggio.file-browser'

export function FileBrowserIcon({ className }: { className?: string }): React.ReactElement {
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
            <path d="M3 4h5l2 2h7a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
    )
}

interface DirEntry {
    name: string
    isDirectory: boolean
    isFile: boolean
    path: string
}

export function FileBrowserPanel(): React.ReactElement {
    const { activeWorkspace, openFile } = useWorkspace()
    const settingsStore = useSettingsStore()

    const showHidden = settingsStore.get<boolean>(EXTENSION_ID, 'showHidden') ?? false
    const excludeStr = settingsStore.get<string>(EXTENSION_ID, 'excludePatterns') ?? '.git,node_modules'
    const excludeSet = new Set(excludeStr.split(',').map((s) => s.trim()).filter(Boolean))

    if (!activeWorkspace) {
        return (
            <div className="file-browser-panel">
                <div className="panel-header">
                    <h3>Files</h3>
                </div>
                <div className="panel-content">
                    <p className="panel-placeholder">Open a workspace to browse files</p>
                </div>
            </div>
        )
    }

    return (
        <div className="file-browser-panel">
            <div className="panel-header">
                <h3>{activeWorkspace.name}</h3>
            </div>
            <div className="file-browser-tree">
                {activeWorkspace.projectPaths.map((rootPath) => (
                    <TreeNode
                        key={rootPath}
                        path={rootPath}
                        name={rootPath.split('/').pop() ?? rootPath}
                        isDirectory
                        depth={0}
                        defaultOpen
                        onFileClick={openFile}
                        showHidden={showHidden}
                        excludeSet={excludeSet}
                    />
                ))}
            </div>
        </div>
    )
}

// ── Tree Node ──────────────────────────────────────────────

interface TreeNodeProps {
    path: string
    name: string
    isDirectory: boolean
    depth: number
    defaultOpen?: boolean
    onFileClick: (path: string) => void
    showHidden: boolean
    excludeSet: Set<string>
}

function TreeNode({
    path,
    name,
    isDirectory,
    depth,
    defaultOpen = false,
    onFileClick,
    showHidden,
    excludeSet
}: TreeNodeProps): React.ReactElement {
    const [open, setOpen] = useState(defaultOpen)
    const [children, setChildren] = useState<DirEntry[] | null>(null)
    const [loading, setLoading] = useState(false)

    const loadChildren = useCallback(async () => {
        if (!isDirectory) return
        setLoading(true)
        try {
            const entries = (await window.electron.fs.readDir(path)) as DirEntry[]
            setChildren(
                entries.filter((e) => {
                    if (excludeSet.has(e.name)) return false
                    if (!showHidden && e.name.startsWith('.')) return false
                    return true
                })
            )
        } catch (error) {
            console.error(`Failed to read directory: ${path}`, error)
            setChildren([])
        }
        setLoading(false)
    }, [path, isDirectory, showHidden, excludeSet])

    useEffect(() => {
        if (open && isDirectory) {
            loadChildren()
        }
    }, [open, isDirectory, loadChildren])

    // Reload when filter settings change
    useEffect(() => {
        if (open && isDirectory && children !== null) {
            loadChildren()
        }
    }, [showHidden, excludeSet]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleClick = () => {
        if (isDirectory) {
            setOpen(!open)
        } else {
            onFileClick(path)
        }
    }

    const icon = isDirectory ? (open ? '▾' : '▸') : getFileIcon(name)

    return (
        <div className="tree-node">
            <div
                className={`tree-node-row ${isDirectory ? 'tree-node-dir' : 'tree-node-file'}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={handleClick}
            >
                <span className="tree-node-icon">{icon}</span>
                <span className="tree-node-name">{name}</span>
            </div>
            {open && isDirectory && (
                <div className="tree-node-children">
                    {loading && (
                        <div
                            className="tree-node-row tree-node-loading"
                            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                        >
                            Loading…
                        </div>
                    )}
                    {children?.map((child) => (
                        <TreeNode
                            key={child.path}
                            path={child.path}
                            name={child.name}
                            isDirectory={child.isDirectory}
                            depth={depth + 1}
                            onFileClick={onFileClick}
                            showHidden={showHidden}
                            excludeSet={excludeSet}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'ts': case 'tsx': return '⬡'
        case 'js': case 'jsx': return '◆'
        case 'json': return '{ }'
        case 'md': case 'markdown': return '¶'
        case 'css': case 'scss': case 'less': return '#'
        case 'html': case 'htm': return '<>'
        case 'py': return '🐍'
        case 'rs': return '⚙'
        case 'go': return '◇'
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp': return '🖼'
        case 'pdf': return '📄'
        default: return '○'
    }
}
