import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * ACP (Agent Communication Protocol) adapter.
 * Used by Claude Code and Codex.
 */
class AcpAdapter implements AgentAdapterInstance {
    private messageHandler?: (message: string) => void

    async connect(): Promise<void> {
        // TODO: Open ACP session via IPC to main process
        console.log('[ACP] Connected')
    }

    async disconnect(): Promise<void> {
        // TODO: Close ACP session
        console.log('[ACP] Disconnected')
    }

    async send(message: string): Promise<string> {
        // TODO: Send via ACP protocol
        console.log('[ACP] Send:', message.slice(0, 80))
        return '[ACP adapter: protocol not yet implemented — use Echo for testing]'
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const acpFactory: AgentAdapterFactory = {
    create() { return new AcpAdapter() }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('acp', acpFactory)

    app.registerAgentTemplate('claude-code', {
        displayName: 'Claude Code',
        adapter: 'acp',
        detect: () => true,
        defaults: {}
    })

    app.registerAgentTemplate('codex', {
        displayName: 'Codex',
        adapter: 'acp',
        detect: () => true,
        defaults: {}
    })
}
