import React, { useState, useEffect } from 'react'
import type { SettingsTabProps } from '../../core/registry'
import { useExtensions } from '../../context/ExtensionContext'

export function CoreExtensionsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="11" y="3" width="6" height="6" rx="1" />
            <rect x="3" y="11" width="6" height="6" rx="1" />
            <rect x="11" y="11" width="6" height="6" rx="1" />
        </svg>
    )
}

interface ExtensionInfo {
    id: string
    name: string
    description: string
    alwaysOn?: boolean  // Can't be disabled (e.g., appearance, general)
}

const CORE_EXTENSIONS: ExtensionInfo[] = [
    {
        id: 'arpeggio.file-browser',
        name: 'File browser',
        description: 'Browse project files in the sidebar with a tree view.',
        alwaysOn: true,
    },
    {
        id: 'arpeggio.markdown-renderer',
        name: 'Markdown editor',
        description: 'WYSIWYG markdown editing with live preview, GFM tables, and task lists.',
    },
    {
        id: 'arpeggio.code-editor',
        name: 'Code editor',
        description: 'Syntax-highlighted code editing powered by Monaco with 40+ languages.',
    },
    {
        id: 'arpeggio.image-viewer',
        name: 'Image viewer',
        description: 'View PNG, JPG, GIF, SVG, and WebP images with zoom controls.',
    },
    {
        id: 'arpeggio.pdf-viewer',
        name: 'PDF viewer',
        description: 'Render and browse PDF documents page by page with zoom.',
    },
    {
        id: 'arpeggio.chat-channels',
        name: 'Chat channels',
        description: 'Create and manage chat channels for agent communication.',
        alwaysOn: true,
    },
    {
        id: 'arpeggio.agent-manager',
        name: 'Agent manager',
        description: 'Configure and manage AI agents in the right sidebar.',
        alwaysOn: true,
    },
    {
        id: 'arpeggio.plaintext-renderer',
        name: 'Plaintext viewer',
        description: 'Fallback viewer for any file type not handled by other extensions.',
    },
]

export function CoreExtensionsSettings({ getSetting, setSetting }: SettingsTabProps): React.ReactElement {
    const { loader } = useExtensions()

    return (
        <div className="core-extensions-list">
            <p className="core-extensions-desc">
                Core extensions provide Arpeggio's built-in functionality. 
                Disable extensions you don't need.
            </p>
            {CORE_EXTENSIONS.map((ext) => (
                <CoreExtensionRow
                    key={ext.id}
                    ext={ext}
                    getSetting={getSetting}
                    setSetting={setSetting}
                />
            ))}
        </div>
    )
}

function CoreExtensionRow({
    ext,
    getSetting,
    setSetting,
}: {
    ext: ExtensionInfo
    getSetting: SettingsTabProps['getSetting']
    setSetting: SettingsTabProps['setSetting']
}): React.ReactElement {
    const settingKey = `enabled:${ext.id}`
    const [enabled, setEnabled] = useState(() => getSetting<boolean>(settingKey) ?? true)

    useEffect(() => {
        setSetting(settingKey, enabled)
    }, [enabled, settingKey, setSetting])

    return (
        <div className={`core-extension-row ${!enabled ? 'disabled' : ''}`}>
            <div className="core-extension-info">
                <div className="core-extension-name">{ext.name}</div>
                <div className="core-extension-desc">{ext.description}</div>
            </div>
            <div className="core-extension-toggle">
                {ext.alwaysOn ? (
                    <span className="core-extension-always-on">Always on</span>
                ) : (
                    <button
                        className={`toggle-switch ${enabled ? 'on' : ''}`}
                        onClick={() => setEnabled(!enabled)}
                        role="switch"
                        aria-checked={enabled}
                    >
                        <span className="toggle-switch-thumb" />
                    </button>
                )}
            </div>
        </div>
    )
}
