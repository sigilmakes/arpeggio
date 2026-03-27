import React, { useState, useEffect } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'

interface DiffViewProps {
    commitHash: string
}

export function DiffView({ commitHash }: DiffViewProps): React.ReactElement {
    const { activeWorkspace } = useWorkspace()
    const [diff, setDiff] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const cwd = activeWorkspace?.projectPaths?.[0]

    useEffect(() => {
        if (!cwd || !window.electron?.git) return
        setDiff(null)
        setError(null)
        window.electron.git
            .show(cwd, commitHash)
            .then(setDiff)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }, [cwd, commitHash])

    if (error) {
        return (
            <div className="file-viewer-error">
                <p>Failed to load diff</p>
                <p className="file-viewer-error-detail">{error}</p>
            </div>
        )
    }

    if (diff === null) {
        return <div className="file-viewer-loading"><p>Loading diff…</p></div>
    }

    return (
        <div className="diff-view">
            <pre className="diff-content">{diff.split('\n').map((line, i) => (
                <span key={i} className={getDiffLineClass(line)}>{line + '\n'}</span>
            ))}</pre>
        </div>
    )
}

function getDiffLineClass(line: string): string {
    if (line.startsWith('+++') || line.startsWith('---')) return 'diff-line-file'
    if (line.startsWith('@@')) return 'diff-line-hunk'
    if (line.startsWith('+')) return 'diff-line-add'
    if (line.startsWith('-')) return 'diff-line-del'
    if (line.startsWith('diff ')) return 'diff-line-header'
    if (line.startsWith('commit ') || line.startsWith('Author:') || line.startsWith('Date:')) return 'diff-line-meta'
    return 'diff-line'
}
