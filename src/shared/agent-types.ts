/**
 * Agent framework types — adapters, templates, lifecycle.
 */

export type AgentStatus = 'available' | 'connecting' | 'active' | 'error' | 'inactive'

export interface AgentConfig {
    id: string
    name: string
    template: string
    adapter: string
    endpoint?: string
    config: Record<string, unknown>
    status: AgentStatus
}

export interface AgentContext {
    workspaceName: string
    projectPaths: string[]
    channelId: string
}

export interface AgentMessage {
    type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'status'
    content: string
    metadata?: Record<string, unknown>
    streaming?: boolean   // true if this is a partial streaming chunk
    done?: boolean        // true if this is the final chunk
}
