import React, { useRef, useEffect, useState } from 'react'
import type { FileRendererProps } from '../../core/registry'
import * as pdfjsLib from 'pdfjs-dist'

// Point to the worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

export function PdfViewer({ path }: FileRendererProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null)
    const [pageCount, setPageCount] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [scale, setScale] = useState(1.5)
    const fileName = path.split('/').pop() ?? path

    useEffect(() => {
        if (!containerRef.current) return
        const container = containerRef.current
        container.innerHTML = ''
        setError(null)

        let cancelled = false

        async function render() {
            try {
                // Read file as base64 then convert to Uint8Array
                const base64 = await window.electron.fs.readFileBase64(path)
                const binary = atob(base64)
                const bytes = new Uint8Array(binary.length)
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i)
                }

                const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
                if (cancelled) return

                setPageCount(pdf.numPages)

                for (let i = 1; i <= pdf.numPages; i++) {
                    if (cancelled) return
                    const page = await pdf.getPage(i)
                    const viewport = page.getViewport({ scale })

                    const canvas = document.createElement('canvas')
                    canvas.className = 'pdf-page-canvas'
                    canvas.width = viewport.width
                    canvas.height = viewport.height
                    container.appendChild(canvas)

                    const ctx = canvas.getContext('2d')!
                    await page.render({ canvasContext: ctx, viewport }).promise
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err))
                }
            }
        }

        render()
        return () => { cancelled = true }
    }, [path, scale])

    if (error) {
        return (
            <div className="file-viewer-error">
                <p>Failed to load PDF</p>
                <p className="file-viewer-error-detail">{error}</p>
            </div>
        )
    }

    return (
        <div className="pdf-viewer">
            <div className="pdf-viewer-toolbar">
                <span className="pdf-viewer-filename">{fileName}</span>
                <div className="pdf-viewer-controls">
                    {pageCount > 0 && <span className="pdf-viewer-pages">{pageCount} pages</span>}
                    <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>−</button>
                    <span className="pdf-viewer-zoom">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale((s) => Math.min(4, s + 0.25))}>+</button>
                </div>
            </div>
            <div className="pdf-viewer-container" ref={containerRef} />
        </div>
    )
}
