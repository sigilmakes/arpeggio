/**
 * Shared types used across main, preload, and renderer processes.
 */

// ── Workspace ──────────────────────────────────────────────

export interface WorkspaceConfig {
    name: string
    projectPaths: string[]
    agents: AgentConfig[]
    channels: ChannelConfig[]
}

export interface AgentConfig {
    id: string
    name: string
    template: string
    adapter: string
    endpoint?: string
    config: Record<string, unknown>
    status: AgentStatus
}

export type AgentStatus = 'available' | 'active' | 'inactive'

export interface ChannelConfig {
    id: string
    name: string
    agents: string[] // agent IDs
}

// ── Extension System ───────────────────────────────────────

export interface ExtensionManifest {
    id: string
    name: string
    version: string
    description?: string
    entryPoint: string
    builtIn: boolean
}

// ── Events ─────────────────────────────────────────────────

export interface ArpeggioEvents {
    'workspace:opened': { workspace: WorkspaceConfig }
    'workspace:closed': { workspaceName: string }
    'channel:created': { channel: ChannelConfig }
    'channel:deleted': { channelId: string }
    'message:received': { channelId: string; message: ChatMessage }
    'message:sent': { channelId: string; message: ChatMessage }
    'agent:connected': { agentId: string }
    'agent:disconnected': { agentId: string }
    'file:opened': { path: string }
    'file:saved': { path: string }
    'extension:loaded': { extensionId: string }
    'extension:error': { extensionId: string; error: string }
}

export type ArpeggioEventName = keyof ArpeggioEvents

// ── Chat ───────────────────────────────────────────────────

export interface ChatMessage {
    id: string
    channelId: string
    sender: MessageSender
    content: string
    timestamp: number
    metadata?: Record<string, unknown>
}

export interface MessageSender {
    type: 'user' | 'agent'
    id: string
    name: string
}

// ── UI ─────────────────────────────────────────────────────

export type SidebarPosition = 'left' | 'right'

export interface SidebarPanelDef {
    icon: string
    label: string
    component: string // component ID — resolved by renderer
    position: SidebarPosition
    order?: number
}

export interface ViewDef {
    displayName: string
    component: string
    filePatterns?: string[]
}

export interface CommandDef {
    description: string
    handler: (...args: unknown[]) => void | Promise<void>
}

// ── IPC Channels ───────────────────────────────────────────

export const IPC_CHANNELS = {
    // Workspace
    WORKSPACE_OPEN: 'workspace:open',
    WORKSPACE_GET_CONFIG: 'workspace:get-config',
    WORKSPACE_LIST: 'workspace:list',

    // File system
    FS_READ_DIR: 'fs:read-dir',
    FS_READ_FILE: 'fs:read-file',
    FS_WRITE_FILE: 'fs:write-file',
    FS_STAT: 'fs:stat',

    // Extensions
    EXTENSION_LIST: 'extension:list',
    EXTENSION_LOAD: 'extension:load',

    // App
    APP_GET_PATH: 'app:get-path',
} as const
