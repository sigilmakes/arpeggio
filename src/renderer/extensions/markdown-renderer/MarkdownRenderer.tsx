import React, { useRef, useCallback, useMemo } from 'react'
import type { FileRendererProps } from '../../core/registry'
import { useSettingsStore } from '../../context/ExtensionContext'
import { MilkdownEditor } from './MilkdownEditor'
import './markdown.css'

const EXTENSION_ID = 'arpeggio.markdown-renderer'

export function MarkdownRenderer({ path, content, onSave }: FileRendererProps): React.ReactElement {
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const settingsStore = useSettingsStore()

    const fontSize = settingsStore.get<number>(EXTENSION_ID, 'fontSize') ?? 16
    const lineWidth = settingsStore.get<number>(EXTENSION_ID, 'lineWidth') ?? 800
    const spellcheck = settingsStore.get<boolean>(EXTENSION_ID, 'spellcheck') ?? true

    const style = useMemo(
        () => ({
            '--md-font-size': `${fontSize}px`,
            '--md-line-width': `${lineWidth}px`
        } as React.CSSProperties),
        [fontSize, lineWidth]
    )

    const handleChange = useCallback(
        (newContent: string) => {
            if (!onSave) return
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
            }
            saveTimerRef.current = setTimeout(() => {
                onSave(newContent)
            }, 1000)
        },
        [onSave]
    )

    return (
        <div className="markdown-renderer" style={style}>
            <MilkdownEditor
                key={path}
                defaultValue={content}
                onChange={handleChange}
                spellcheck={spellcheck}
            />
        </div>
    )
}
