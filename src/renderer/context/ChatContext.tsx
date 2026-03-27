import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { WorkspaceConfig, ChannelConfig } from '@shared/types'
import type { ChatMessage } from '@shared/message-types'
import { createMessage, CURRENT_USER, SYSTEM_SENDER } from '@shared/message-types'
import { useWorkspace } from './WorkspaceContext'

interface ChatContextValue {
    channels: ChannelConfig[]
    activeChannel: ChannelConfig | null
    setActiveChannel: (id: string) => void
    messages: ChatMessage[]
    sendMessage: (content: string) => Promise<void>
    createChannel: (name: string) => Promise<void>
    deleteChannel: (id: string) => Promise<void>
    renameChannel: (id: string, name: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const { activeWorkspace } = useWorkspace()
    const [channels, setChannels] = useState<ChannelConfig[]>([])
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])

    const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

    // Load channels when workspace changes
    useEffect(() => {
        if (!activeWorkspace) {
            setChannels([])
            setActiveChannelId(null)
            setMessages([])
            return
        }
        setChannels(activeWorkspace.channels ?? [])
        const first = activeWorkspace.channels?.[0]
        if (first) setActiveChannelId(first.id)
    }, [activeWorkspace?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Load messages when channel changes
    useEffect(() => {
        if (!activeWorkspace || !activeChannelId) {
            setMessages([])
            return
        }
        window.electron.chat
            .readMessages(activeWorkspace.id, activeChannelId, 200)
            .then((msgs) => setMessages(msgs as ChatMessage[]))
            .catch(() => setMessages([]))
    }, [activeWorkspace?.id, activeChannelId]) // eslint-disable-line react-hooks/exhaustive-deps

    const sendMessage = useCallback(
        async (content: string) => {
            if (!activeWorkspace || !activeChannelId || !content.trim()) return

            // Handle slash commands
            if (content.startsWith('/')) {
                const [cmd, ...args] = content.slice(1).split(' ')
                // For now just echo it as a system message
                const sysMsg = createMessage(activeChannelId, SYSTEM_SENDER, `Unknown command: /${cmd}`, 'system')
                setMessages((prev) => [...prev, sysMsg])
                await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, sysMsg)
                return
            }

            const msg = createMessage(activeChannelId, CURRENT_USER, content.trim())
            setMessages((prev) => [...prev, msg])
            await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, msg)

            // Echo agent for testing (P3 mock — replaced by real agents in P4)
            setTimeout(async () => {
                const echoSender = { id: 'echo', name: 'Echo', type: 'agent' as const }
                const echoMsg = createMessage(activeChannelId, echoSender, content.trim(), 'text')
                setMessages((prev) => [...prev, echoMsg])
                await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, echoMsg)
            }, 300)
        },
        [activeWorkspace, activeChannelId]
    )

    const createChannel = useCallback(
        async (name: string) => {
            if (!activeWorkspace) return
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `ch-${Date.now()}`
            const newChannel: ChannelConfig = { id, name, agents: [] }
            const updated = [...channels, newChannel]
            setChannels(updated)
            setActiveChannelId(id)

            // Update workspace config
            const config = { ...activeWorkspace, channels: updated }
            const wsDir = `${activeWorkspace.id}`
            await window.electron.workspace.create({ id: config.id, name: config.name, projectPaths: config.projectPaths })
                .catch(() => {}) // may already exist
            // Save updated config by writing workspace.json directly
            const configJson = JSON.stringify(config, null, 4)
            const homePath = await window.electron.app.getPath('home')
            await window.electron.fs.writeFile(`${homePath}/.arpeggio/workspaces/${wsDir}/workspace.json`, configJson)

            // System message
            const sysMsg = createMessage(id, SYSTEM_SENDER, `Channel #${name} created`, 'system')
            await window.electron.chat.appendMessage(activeWorkspace.id, id, sysMsg)
            setMessages([sysMsg])
        },
        [activeWorkspace, channels]
    )

    const deleteChannel = useCallback(
        async (id: string) => {
            if (!activeWorkspace) return
            const updated = channels.filter((c) => c.id !== id)
            setChannels(updated)
            if (activeChannelId === id) {
                setActiveChannelId(updated[0]?.id ?? null)
            }

            const config = { ...activeWorkspace, channels: updated }
            const homePath = await window.electron.app.getPath('home')
            await window.electron.fs.writeFile(
                `${homePath}/.arpeggio/workspaces/${activeWorkspace.id}/workspace.json`,
                JSON.stringify(config, null, 4)
            )
        },
        [activeWorkspace, channels, activeChannelId]
    )

    const renameChannel = useCallback(
        async (id: string, name: string) => {
            if (!activeWorkspace) return
            const updated = channels.map((c) => (c.id === id ? { ...c, name } : c))
            setChannels(updated)

            const config = { ...activeWorkspace, channels: updated }
            const homePath = await window.electron.app.getPath('home')
            await window.electron.fs.writeFile(
                `${homePath}/.arpeggio/workspaces/${activeWorkspace.id}/workspace.json`,
                JSON.stringify(config, null, 4)
            )
        },
        [activeWorkspace, channels]
    )

    return (
        <ChatContext.Provider
            value={{
                channels,
                activeChannel,
                setActiveChannel: setActiveChannelId,
                messages,
                sendMessage,
                createChannel,
                deleteChannel,
                renameChannel,
            }}
        >
            {children}
        </ChatContext.Provider>
    )
}

export function useChat(): ChatContextValue {
    const ctx = useContext(ChatContext)
    if (!ctx) throw new Error('useChat must be used within a ChatProvider')
    return ctx
}
