import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { WorkspaceConfig, ChannelConfig } from '@shared/types'
import type { ChatMessage, ToolCall, ThinkingBlock } from '@shared/message-types'
import { createMessage, createToolCallMessage, CURRENT_USER, SYSTEM_SENDER } from '@shared/message-types'
import { useWorkspace } from './WorkspaceContext'
import { useRegistry } from './ExtensionContext'
import type { AgentConfig } from '@shared/agent-types'
import type { AgentAdapterInstance } from '../core/registry'

interface ChatContextValue {
    channels: ChannelConfig[]
    activeChannel: ChannelConfig | null
    setActiveChannel: (id: string) => void
    messages: ChatMessage[]
    sendMessage: (content: string) => Promise<void>
    createChannel: (name: string) => Promise<void>
    deleteChannel: (id: string) => Promise<void>
    renameChannel: (id: string, name: string) => Promise<void>
    toggleToolCall: (messageId: string, toolCallId: string) => void
    toggleAllToolCalls: () => void
    toggleThinking: (messageId: string) => void
    toggleAllThinking: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

// Keep adapter instances alive between messages
const adapterCache = new Map<string, AgentAdapterInstance>()

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
        if (!activeWorkspace || !activeChannelId || !window.electron?.chat) {
            setMessages([])
            return
        }
        window.electron.chat
            .readMessages(activeWorkspace.id, activeChannelId, 200)
            .then((msgs) => setMessages(msgs as ChatMessage[]))
            .catch(() => setMessages([]))
    }, [activeWorkspace?.id, activeChannelId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Get or create adapter for an agent
    const getAdapter = useCallback((agent: AgentConfig): AgentAdapterInstance | null => {
        // Check cache
        if (adapterCache.has(agent.id)) {
            return adapterCache.get(agent.id)!
        }
        const adapterEntry = registry.getAgentAdapter(agent.adapter)
        if (!adapterEntry) return null
        // Pass workspace cwd to the adapter config
        const config = {
            ...agent.config,
            cwd: activeWorkspace?.projectPaths?.[0]
        }
        const instance = adapterEntry.factory.create(config)
        adapterCache.set(agent.id, instance)
        return instance
    }, [registry, activeWorkspace])

    const sendMessage = useCallback(
        async (content: string) => {
            if (!activeWorkspace || !activeChannelId || !content.trim() || !window.electron?.chat) return

            // Slash commands
            if (content.startsWith('/')) {
                const [cmd] = content.slice(1).split(' ')
                const sysMsg = createMessage(activeChannelId, SYSTEM_SENDER, `Unknown command: /${cmd}`, 'system')
                setMessages((prev) => [...prev, sysMsg])
                await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, sysMsg)
                return
            }

            // User message
            const msg = createMessage(activeChannelId, CURRENT_USER, content.trim())
            setMessages((prev) => [...prev, msg])
            await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, msg)

            // Route to agents
            const channelAgentIds = activeChannel?.agents ?? []
            const workspaceAgents: AgentConfig[] = activeWorkspace.agents ?? []
            const agentsToRoute = channelAgentIds.length > 0
                ? workspaceAgents.filter((a) => channelAgentIds.includes(a.id))
                : workspaceAgents

            for (const agent of agentsToRoute) {
                const adapter = getAdapter(agent)
                if (!adapter) continue

                const agentSender = { id: agent.id, name: agent.name, type: 'agent' as const }

                // Create a streaming placeholder message
                const streamId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                const streamMsg: ChatMessage = {
                    id: streamId,
                    channelId: activeChannelId,
                    sender: agentSender,
                    timestamp: Date.now(),
                    content: '',
                    messageType: 'text',
                    streaming: true
                }
                setMessages((prev) => [...prev, streamMsg])

                try {
                    // Incremental streaming handler — updates message fields live
                    adapter.onMessage?.((raw: string) => {
                        try {
                            const evt = JSON.parse(raw)
                            setMessages((prev) => prev.map((m) => {
                                if (m.id !== streamId) return m
                                const updated = { ...m }

                                if (evt.type === 'text') {
                                    updated.content = evt.content
                                }
                                if (evt.type === 'thinking_start') {
                                    updated.thinking = { content: '', collapsed: false }
                                }
                                if (evt.type === 'thinking_delta') {
                                    updated.thinking = { ...updated.thinking, content: evt.content, collapsed: false }
                                }
                                if (evt.type === 'thinking_end') {
                                    updated.thinking = { content: evt.content, collapsed: true, durationMs: evt.durationMs }
                                }
                                if (evt.type === 'tool_start') {
                                    const tc: ToolCall = {
                                        id: evt.id, name: evt.name,
                                        input: evt.input || '', status: 'running', collapsed: false
                                    }
                                    updated.toolCalls = [...(updated.toolCalls ?? []), tc]
                                }
                                if (evt.type === 'tool_end') {
                                    updated.toolCalls = (updated.toolCalls ?? []).map((tc) =>
                                        tc.id === evt.id
                                            ? { ...tc, output: evt.output, status: evt.status, collapsed: true }
                                            : tc
                                    )
                                }
                                return updated
                            }))
                        } catch { /* not JSON */ }
                    })

                    const response = await adapter.send(content.trim())
                    if (response) {
                        // Parse final structured response
                        let finalContent = response
                        let toolCalls: ToolCall[] | undefined
                        let thinking: ThinkingBlock | undefined

                        try {
                            const parsed = JSON.parse(response)
                            if (parsed.content) finalContent = parsed.content
                            if (parsed.toolCalls && Array.isArray(parsed.toolCalls)) {
                                toolCalls = parsed.toolCalls.map((tc: any) => ({
                                    id: tc.id || `tc-${Math.random().toString(36).slice(2, 8)}`,
                                    name: tc.name || 'unknown',
                                    input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input, null, 2),
                                    output: tc.output ? (typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output, null, 2)) : undefined,
                                    status: (tc.status || 'done') as 'done' | 'error' | 'running',
                                    collapsed: true
                                }))
                            }
                            if (parsed.thinking) {
                                thinking = { content: parsed.thinking.content || '', collapsed: true, durationMs: parsed.thinking.durationMs }
                            }
                        } catch { /* plain text */ }

                        // Final update — mark streaming done, ensure all fields set
                        setMessages((prev) => prev.map((m) => {
                            if (m.id !== streamId) return m
                            return {
                                ...m,
                                content: finalContent,
                                streaming: false,
                                // Keep live-streamed tool calls/thinking if final doesn't have them
                                toolCalls: toolCalls ?? m.toolCalls,
                                thinking: thinking ?? (m.thinking ? { ...m.thinking, collapsed: true } : undefined)
                            }
                        }))

                        // Persist final message
                        const finalMsg = { ...streamMsg, content: finalContent, streaming: false, toolCalls, thinking }
                        await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, finalMsg)
                    } else {
                        setMessages((prev) => prev.filter((m) => m.id !== streamId))
                    }
                } catch (err) {
                    const errContent = `Error: ${err instanceof Error ? err.message : String(err)}`
                    setMessages((prev) => prev.map((m) =>
                        m.id === streamId ? { ...m, content: errContent, streaming: false } : m
                    ))
                    const errMsg = createMessage(activeChannelId, SYSTEM_SENDER, `${agent.name}: ${errContent}`, 'system')
                    await window.electron.chat.appendMessage(activeWorkspace.id, activeChannelId, errMsg)
                }
            }
        },
        [activeWorkspace, activeChannelId, activeChannel, getAdapter]
    )

    // Toggle individual tool call collapsed state
    const toggleToolCall = useCallback((messageId: string, toolCallId: string) => {
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId || !m.toolCalls) return m
            return {
                ...m,
                toolCalls: m.toolCalls.map((tc) =>
                    tc.id === toolCallId ? { ...tc, collapsed: !tc.collapsed } : tc
                )
            }
        }))
    }, [])

    // Toggle all tool calls in all messages
    const toggleAllToolCalls = useCallback(() => {
        setMessages((prev) => {
            const anyExpanded = prev.some((m) => m.toolCalls?.some((tc) => !tc.collapsed))
            return prev.map((m) => {
                if (!m.toolCalls) return m
                return {
                    ...m,
                    toolCalls: m.toolCalls.map((tc) => ({ ...tc, collapsed: anyExpanded }))
                }
            })
        })
    }, [])

    // Toggle individual thinking block
    const toggleThinking = useCallback((messageId: string) => {
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId || !m.thinking) return m
            return { ...m, thinking: { ...m.thinking, collapsed: !m.thinking.collapsed } }
        }))
    }, [])

    // Toggle all thinking blocks
    const toggleAllThinking = useCallback(() => {
        setMessages((prev) => {
            const anyExpanded = prev.some((m) => m.thinking && !m.thinking.collapsed)
            return prev.map((m) => {
                if (!m.thinking) return m
                return { ...m, thinking: { ...m.thinking, collapsed: anyExpanded } }
            })
        })
    }, [])

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
            if (activeChannelId === id) setActiveChannelId(updated[0]?.id ?? null)
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

    // Ctrl+O to toggle all tool calls, Ctrl+T to toggle all thinking
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault()
                toggleAllToolCalls()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault()
                toggleAllThinking()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [toggleAllToolCalls, toggleAllThinking])

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
                toggleToolCall,
                toggleAllToolCalls,
                toggleThinking,
                toggleAllThinking,
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
