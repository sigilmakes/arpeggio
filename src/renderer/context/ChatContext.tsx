import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { WorkspaceConfig, ChannelConfig } from '@shared/types'
import type { ChatMessage, ToolCall, ThinkingBlock, ContentBlock } from '@shared/message-types'
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
                    // Incremental streaming — builds ordered content blocks
                    adapter.onMessage?.((raw: string) => {
                        try {
                            const evt = JSON.parse(raw)
                            setMessages((prev) => prev.map((m) => {
                                if (m.id !== streamId) return m
                                const blocks = [...(m.blocks ?? [])]

                                if (evt.type === 'text') {
                                    // Find the last text block — only update it if nothing else
                                    // came after it (tool call or thinking). Otherwise start a new one.
                                    const lastIdx = blocks.length - 1
                                    if (lastIdx >= 0 && blocks[lastIdx].type === 'text') {
                                        blocks[lastIdx] = { type: 'text', content: evt.content }
                                    } else {
                                        // Text after a tool call or thinking — this is new text
                                        // We need to figure out the delta since last text
                                        const prevTextBlocks = blocks.filter((b) => b.type === 'text')
                                        const prevText = prevTextBlocks.map((b) => (b as any).content).join('')
                                        const newText = evt.content.slice(prevText.length)
                                        if (newText) {
                                            blocks.push({ type: 'text', content: newText })
                                        }
                                    }
                                }
                                if (evt.type === 'thinking_start') {
                                    blocks.push({ type: 'thinking', content: '', collapsed: false })
                                }
                                if (evt.type === 'thinking_delta') {
                                    const idx = blocks.findLastIndex((b) => b.type === 'thinking')
                                    if (idx >= 0) blocks[idx] = { ...blocks[idx], type: 'thinking', content: evt.content, collapsed: false }
                                }
                                if (evt.type === 'thinking_end') {
                                    const idx = blocks.findLastIndex((b) => b.type === 'thinking')
                                    if (idx >= 0) blocks[idx] = { type: 'thinking', content: evt.content, collapsed: true, durationMs: evt.durationMs }
                                }
                                if (evt.type === 'tool_start') {
                                    // New text block will be created after this tool if more text comes
                                    blocks.push({
                                        type: 'tool_call', id: evt.id, name: evt.name,
                                        input: evt.input || '', status: 'running', collapsed: false
                                    })
                                }
                                if (evt.type === 'tool_end') {
                                    const idx = blocks.findIndex((b) => b.type === 'tool_call' && (b as any).id === evt.id)
                                    if (idx >= 0) {
                                        blocks[idx] = { ...blocks[idx], type: 'tool_call', output: evt.output, status: evt.status, collapsed: true } as ContentBlock
                                    }
                                }

                                const content = blocks.filter((b) => b.type === 'text').map((b) => (b as any).content).join('')
                                return { ...m, blocks, content, streaming: true }
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

                        // Final update — keep streamed blocks, just mark done
                        setMessages((prev) => prev.map((m) => {
                            if (m.id !== streamId) return m
                            return {
                                ...m,
                                content: finalContent,
                                streaming: false,
                                toolCalls: toolCalls ?? m.toolCalls,
                                thinking: thinking ?? (m.thinking ? { ...m.thinking, collapsed: true } : undefined),
                                // Keep live-built blocks if present
                                blocks: m.blocks && m.blocks.length > 0 ? m.blocks : undefined
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
            if (m.id !== messageId) return m
            const updated = { ...m }
            // Toggle in blocks
            if (updated.blocks) {
                updated.blocks = updated.blocks.map((b) =>
                    b.type === 'tool_call' && b.id === toolCallId ? { ...b, collapsed: !b.collapsed } : b
                )
            }
            // Toggle in toolCalls too
            if (updated.toolCalls) {
                updated.toolCalls = updated.toolCalls.map((tc) =>
                    tc.id === toolCallId ? { ...tc, collapsed: !tc.collapsed } : tc
                )
            }
            return updated
        }))
    }, [])

    const toggleAllToolCalls = useCallback(() => {
        setMessages((prev) => {
            const anyExpanded = prev.some((m) =>
                m.blocks?.some((b) => b.type === 'tool_call' && !b.collapsed) ||
                m.toolCalls?.some((tc) => !tc.collapsed)
            )
            return prev.map((m) => ({
                ...m,
                blocks: m.blocks?.map((b) => b.type === 'tool_call' ? { ...b, collapsed: anyExpanded } : b),
                toolCalls: m.toolCalls?.map((tc) => ({ ...tc, collapsed: anyExpanded }))
            }))
        })
    }, [])

    const toggleThinking = useCallback((messageId: string) => {
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId) return m
            return {
                ...m,
                thinking: m.thinking ? { ...m.thinking, collapsed: !m.thinking.collapsed } : undefined,
                blocks: m.blocks?.map((b) => b.type === 'thinking' ? { ...b, collapsed: !b.collapsed } : b)
            }
        }))
    }, [])

    const toggleAllThinking = useCallback(() => {
        setMessages((prev) => {
            const anyExpanded = prev.some((m) =>
                m.blocks?.some((b) => b.type === 'thinking' && !b.collapsed) ||
                (m.thinking && !m.thinking.collapsed)
            )
            return prev.map((m) => ({
                ...m,
                thinking: m.thinking ? { ...m.thinking, collapsed: anyExpanded } : undefined,
                blocks: m.blocks?.map((b) => b.type === 'thinking' ? { ...b, collapsed: anyExpanded } : b)
            }))
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
