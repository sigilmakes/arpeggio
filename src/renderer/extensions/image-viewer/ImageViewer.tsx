import React, { useState, useEffect } from 'react'
import type { FileRendererProps } from '../../core/registry'
import { useSettingsStore } from '../../context/ExtensionContext'

const EXTENSION_ID = 'arpeggio.image-viewer'

export function ImageViewer({ path }: FileRendererProps): React.ReactElement {
    const [dataUrl, setDataUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [zoom, setZoom] = useState(100)
    const settingsStore = useSettingsStore()

    const background = settingsStore.get<string>(EXTENSION_ID, 'background') ?? 'checkered'
    const fitMode = settingsStore.get<string>(EXTENSION_ID, 'fitMode') ?? 'contain'

    const fileName = path.split('/').pop() ?? path
    const isSvg = path.endsWith('.svg')

    useEffect(() => {
        setError(null)
        // Use custom protocol to serve local files
        setDataUrl(`arpeggio-file://${encodeURI(path)}`)
    }, [path])

    if (error) {
        return (
            <div className="file-viewer-error">
                <p>Failed to load image</p>
                <p className="file-viewer-error-detail">{error}</p>
            </div>
        )
    }

    const bgClass = background === 'checkered' ? 'img-bg-checkered' : background === 'dark' ? 'img-bg-dark' : 'img-bg-light'

    return (
        <div className="image-viewer">
            <div className="image-viewer-toolbar">
                <span className="image-viewer-filename">{fileName}</span>
                <div className="image-viewer-controls">
                    <button onClick={() => setZoom((z) => Math.max(10, z - 25))} title="Zoom out">−</button>
                    <span className="image-viewer-zoom">{zoom}%</span>
                    <button onClick={() => setZoom((z) => Math.min(500, z + 25))} title="Zoom in">+</button>
                    <button onClick={() => setZoom(100)} title="Reset zoom">1:1</button>
                </div>
            </div>
            <div className={`image-viewer-canvas ${bgClass}`}>
                {dataUrl && (
                    <img
                        src={dataUrl}
                        alt={fileName}
                        className="image-viewer-img"
                        style={{
                            maxWidth: fitMode === 'contain' && zoom === 100 ? '100%' : undefined,
                            maxHeight: fitMode === 'contain' && zoom === 100 ? '100%' : undefined,
                            width: zoom !== 100 ? `${zoom}%` : undefined,
                        }}
                        onError={() => setError('Failed to load image file')}
                    />
                )}
            </div>
        </div>
    )
}
