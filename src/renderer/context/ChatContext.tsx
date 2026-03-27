import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { WorkspaceConfig, ChannelConfig } from '@shared/types'
import type { ChatMessage } from '@shared/message-types'
import { createMessage, CURRENT_USER, SYSTEM_SENDER } from '@shared/message-types'
import { useWorkspace } from './WorkspaceContext'
import { useRegistry } from './ExtensionContext'
import type { AgentConfig } from '@shared/agent-types'

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
    const registry = useRegistry()
    const [channels, setChannels] = useState<ChannelConfig[]>([])
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])

    const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

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

    useEffect(() => {
        if (!activeWorkspace || !activeChannelId) {
            setMessages([])
            return
        }
        if (!window.electron?.chat) return
        window.electron.chat
            .readMessages(activeWorkspace.id, activeChannelId, 200)
            .then((msgs) => setMessages(msgs as ChatMessage[]))
            .catch(() => setMessages([]))
    }, [activeWorkspace?.id, activeChannelId]) // eslint-disable-line react-hooks/exhaustive-deps

    const sendMessage = useCallback(
        async (content: string) => {
            if (!activeWorkspace || !activeChannelId || !content.trim() || !window.electron?.chat) return

            // Handle slash commands
            if (content.startsWith('/')) {
                const [cmd] = content.slice(1).split(' ')
                const sysMsg = createMessage(activeChannelId, SYSTEM_SENDER, `Unknown command: /${cmd}`, 'system')
                setMessages((prev) => [...prev, sysMsg])
                await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, sysMsg)
                return
            }

            // Send user message
            const msg = createMessage(activeChannelId, CURRENT_USER, content.trim())
            setMessages((prev) => [...prev, msg])
            await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, msg)

            // Route to agents in this channel
            const channelAgentIds = activeChannel?.agents ?? []
            const workspaceAgents: AgentConfig[] = activeWorkspace.agents ?? []

            // If no agents assigned, route to ALL workspace agents
            const agentsToRoute = channelAgentIds.length > 0
                ? workspaceAgents.filter((a) => channelAgentIds.includes(a.id))
                : workspaceAgents

            for (const agent of agentsToRoute) {
                const adapterEntry = registry.getAgentAdapter(agent.adapter)
                if (!adapterEntry) continue

                try {
                    const instance = adapterEntry.factory.create(agent.config)
                    const response = await instance.send(content.trim())
                    if (response) {
                        const agentSender = {
                            id: agent.id,
                            name: agent.name,
                            type: 'agent' as const
                        }
                        const agentMsg = createMessage(activeChannelId, agentSender, response, 'text')
                        setMessages((prev) => [...prev, agentMsg])
                        await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, agentMsg)
                    }
                } catch (err) {
                    const errMsg = createMessage(
                        activeChannelId,
                        SYSTEM_SENDER,
                        `${agent.name} error: ${err instanceof Error ? err.message : String(err)}`,
                        'system'
                    )
                    setMessages((prev) => [...prev, errMsg])
                    await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, errMsg)
                }
            }
        },
        [activeWorkspace, activeChannelId, activeChannel, registry]
    )

    const saveWorkspaceConfig = useCallback(
        async (updated: ChannelConfig[]) => {
            if (!activeWorkspace) return
            const config = { ...activeWorkspace, channels: updated }
            const homePath = await window.electron.app.getPath('home')
            await window.electron.fs.writeFile(
                `${homePath}/.arpeggio/workspaces/${activeWorkspace.id}/workspace.json`,
                JSON.stringify(config, null, 4)
            )
        },
        [activeWorkspace]
    )

    const createChannel = useCallback(
        async (name: string) => {
            if (!activeWorkspace || !window.electron?.chat) return
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `ch-${Date.now()}`
            const newChannel: ChannelConfig = { id, name, agents: [] }
            const updated = [...channels, newChannel]
            setChannels(updated)
            setActiveChannelId(id)
            await saveWorkspaceConfig(updated)

            const sysMsg = createMessage(id, SYSTEM_SENDER, `Channel #${name} created`, 'system')
            await window.electron.chat.appendMessage(activeWorkspace.id, id, sysMsg)
            setMessages([sysMsg])
        },
        [activeWorkspace, channels, saveWorkspaceConfig]
    )

    const deleteChannel = useCallback(
        async (id: string) => {
            if (!activeWorkspace) return
            const updated = channels.filter((c) => c.id !== id)
            setChannels(updated)
            if (activeChannelId === id) {
                setActiveChannelId(updated[0]?.id ?? null)
            }
            await saveWorkspaceConfig(updated)
        },
        [activeWorkspace, channels, activeChannelId, saveWorkspaceConfig]
    )

    const renameChannel = useCallback(
        async (id: string, name: string) => {
            if (!activeWorkspace) return
            const updated = channels.map((c) => (c.id === id ? { ...c, name } : c))
            setChannels(updated)
            await saveWorkspaceConfig(updated)
        },
        [activeWorkspace, channels, saveWorkspaceConfig]
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
