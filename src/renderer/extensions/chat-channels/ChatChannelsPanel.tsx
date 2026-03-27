import React, { useState } from 'react'
import { useChat } from '../../context/ChatContext'
import { useWorkspace } from '../../context/WorkspaceContext'

export function ChatChannelsIcon({ className }: { className?: string }): React.ReactElement {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h12a2 2 0 012 2v7a2 2 0 01-2 2H7l-3 3V6a2 2 0 012-2z" />
        </svg>
    )
}

export function ChatChannelsPanel(): React.ReactElement {
    const { activeWorkspace } = useWorkspace()
    const { channels, activeChannel, setActiveChannel, createChannel, deleteChannel } = useChat()
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')

    // Also open the chat view in center pane when selecting a channel
    const { openFile } = useWorkspace()

    if (!activeWorkspace) {
        return (
            <div className="panel-content">
                <p className="panel-placeholder">Open a workspace to chat</p>
            </div>
        )
    }

    const handleSelect = (id: string) => {
        setActiveChannel(id)
        // Open the chat view as a "tab" using a special chat:// URI
        openFile(`chat://${id}`)
    }

    const handleCreate = () => {
        if (!newName.trim()) return
        createChannel(newName.trim())
        // Open the new channel in center pane
        const id = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        openFile(`chat://${id}`)
        setNewName('')
        setShowCreate(false)
    }

    return (
        <div className="chat-channels-panel">
            <div className="channel-list">
                {channels.map((ch) => (
                    <div
                        key={ch.id}
                        className={`channel-item ${ch.id === activeChannel?.id ? 'active' : ''}`}
                        onClick={() => handleSelect(ch.id)}
                    >
                        <span className="channel-hash">#</span>
                        <span className="channel-name">{ch.name}</span>
                        {channels.length > 1 && (
                            <button
                                className="channel-delete"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deleteChannel(ch.id)
                                }}
                                title="Delete channel"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {showCreate ? (
                <div className="channel-create-form">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
                        placeholder="channel-name"
                        autoFocus
                        className="channel-create-input"
                    />
                </div>
            ) : (
                <button className="panel-action-btn" onClick={() => setShowCreate(true)}>
                    + New Channel
                </button>
            )}
        </div>
    )
}
