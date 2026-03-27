import React from 'react'
import type { FileRendererProps } from '../../core/registry'

export function PdfViewer({ path }: FileRendererProps): React.ReactElement {
    const fileName = path.split('/').pop() ?? path

    // Electron can render PDFs via embed with file:// protocol
    // We need to add pdf to the CSP or use webview
    return (
        <div className="pdf-viewer">
            <div className="pdf-viewer-toolbar">
                <span className="pdf-viewer-filename">{fileName}</span>
            </div>
            <div className="pdf-viewer-container">
                <embed
                    src={`file://${path}`}
                    type="application/pdf"
                    className="pdf-viewer-embed"
                />
            </div>
        </div>
    )
}
