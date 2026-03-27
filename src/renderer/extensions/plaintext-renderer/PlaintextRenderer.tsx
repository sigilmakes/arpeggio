import React from 'react'
import type { FileRendererProps } from '../../core/registry'

export function PlaintextRenderer({ path, content }: FileRendererProps): React.ReactElement {
    const fileName = path.split('/').pop() ?? path
    const lineCount = content.split('\n').length

    return (
        <div className="plaintext-renderer">
            <div className="plaintext-header">
                <span className="plaintext-filename">{fileName}</span>
                <span className="plaintext-meta">{lineCount} lines</span>
            </div>
            <pre className="plaintext-content">
                <code>{content}</code>
            </pre>
        </div>
    )
}
