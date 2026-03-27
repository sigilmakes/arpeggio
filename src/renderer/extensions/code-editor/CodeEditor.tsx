import React, { useRef, useEffect, useCallback } from 'react'
import * as monaco from 'monaco-editor'
import type { FileRendererProps } from '../../core/registry'
import { useSettingsStore } from '../../context/ExtensionContext'

const EXTENSION_ID = 'arpeggio.code-editor'

function getLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
        json: 'json', jsonc: 'json',
        css: 'css', scss: 'scss', less: 'less',
        html: 'html', htm: 'html', xml: 'xml', svg: 'xml',
        py: 'python', pyw: 'python',
        rs: 'rust', go: 'go',
        java: 'java', kt: 'kotlin', kts: 'kotlin',
        c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
        cs: 'csharp', rb: 'ruby', php: 'php',
        sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
        yaml: 'yaml', yml: 'yaml',
        toml: 'ini', ini: 'ini', cfg: 'ini',
        sql: 'sql', lua: 'lua', swift: 'swift', r: 'r',
        dockerfile: 'dockerfile',
        graphql: 'graphql', gql: 'graphql',
        md: 'markdown',
    }
    return map[ext] ?? 'plaintext'
}

export function CodeEditor({ path, content, onSave }: FileRendererProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const settingsStore = useSettingsStore()

    const fontSize = settingsStore.get<number>(EXTENSION_ID, 'fontSize') ?? 14
    const tabSize = settingsStore.get<number>(EXTENSION_ID, 'tabSize') ?? 4
    const wordWrap = settingsStore.get<boolean>(EXTENSION_ID, 'wordWrap') ?? true
    const lineNumbers = settingsStore.get<boolean>(EXTENSION_ID, 'lineNumbers') ?? true
    const showMinimap = settingsStore.get<boolean>(EXTENSION_ID, 'minimap') ?? false
    const bracketColors = settingsStore.get<boolean>(EXTENSION_ID, 'bracketColors') ?? true

    const handleChange = useCallback(
        (value: string | undefined) => {
            if (!onSave || value === undefined) return
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => onSave(value), 1000)
        },
        [onSave]
    )

    useEffect(() => {
        if (!containerRef.current) return

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

        const editor = monaco.editor.create(containerRef.current, {
            value: content,
            language: getLanguage(path),
            theme: isDark ? 'vs-dark' : 'vs',
            fontSize,
            tabSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            lineNumbers: lineNumbers ? 'on' : 'off',
            minimap: { enabled: showMinimap },
            wordWrap: wordWrap ? 'on' : 'off',
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 12 },
            bracketPairColorization: { enabled: bracketColors },
            guides: { bracketPairs: true, indentation: true },
        })

        editor.onDidChangeModelContent(() => handleChange(editor.getValue()))

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (onSave) {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
                onSave(editor.getValue())
            }
        })

        editorRef.current = editor

        // Theme observer
        const observer = new MutationObserver(() => {
            const dark = document.documentElement.getAttribute('data-theme') === 'dark'
            monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

        return () => {
            observer.disconnect()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            editor.dispose()
        }
    }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={containerRef} className="code-editor-container" />
}
