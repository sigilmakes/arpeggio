/**
 * Chat message schema — stored as JSONL, one message per line.
 */

export interface ChatMessage {
    id: string
    channelId: string
    sender: MessageSender
    timestamp: number
    content: string
    messageType: MessageType
    metadata?: Record<string, unknown>
    // Streaming support
    streaming?: boolean
    // Tool calls
    toolCalls?: ToolCall[]
    // Thinking blocks
    thinking?: ThinkingBlock
}

export interface MessageSender {
    id: string
    name: string
    type: 'user' | 'agent' | 'system'
    avatar?: string
}

export type MessageType = 'text' | 'system' | 'command' | 'tool_call' | 'tool_result'

export interface ToolCall {
    id: string
    name: string
    input: string
    output?: string
    status: 'running' | 'done' | 'error'
    collapsed: boolean
}

export interface ThinkingBlock {
    content: string
    collapsed: boolean
    durationMs?: number
}

export const CURRENT_USER: MessageSender = {
    id: 'user',
    name: 'You',
    type: 'user'
}

export const SYSTEM_SENDER: MessageSender = {
    id: 'system',
    name: 'System',
    type: 'system'
}

export function createMessage(
    channelId: string,
    sender: MessageSender,
    content: string,
    messageType: MessageType = 'text',
    metadata?: Record<string, unknown>
): ChatMessage {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channelId,
        sender,
        timestamp: Date.now(),
        content,
        messageType,
        metadata
    }
}

export function createToolCallMessage(
    channelId: string,
    sender: MessageSender,
    toolCalls: ToolCall[]
): ChatMessage {
    const summary = toolCalls.map((t) => t.name).join(', ')
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channelId,
        sender,
        timestamp: Date.now(),
        content: `Used tools: ${summary}`,
        messageType: 'tool_call',
        toolCalls
    }
}
