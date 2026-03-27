import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * STDIO adapter — communicates with agents via subprocess stdin/stdout.
 * Used for agents like Aider, Codex, etc.
 *
 * Note: The actual subprocess spawning happens in the main process via IPC.
 * This adapter sends messages via IPC and receives responses.
 */

class StdioAdapter implements AgentAdapterInstance {
    private messageHandler?: (message: string) => void
    private command: string

    constructor(config: Record<string, unknown>) {
        this.command = (config.command as string) || ''
    }

    async connect(): Promise<void> {
        // TODO: IPC to main process to spawn subprocess
        console.log(`[STDIO] Would spawn: ${this.command}`)
    }

    async disconnect(): Promise<void> {
        // TODO: IPC to main process to kill subprocess
        console.log('[STDIO] Would disconnect')
    }

    async send(message: string): Promise<string> {
        // TODO: IPC to main process to write to stdin, read from stdout
        console.log(`[STDIO] Would send: ${message}`)
        return '[STDIO adapter not yet implemented]'
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const stdioFactory: AgentAdapterFactory = {
    create(config) {
        return new StdioAdapter(config)
    }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('stdio', stdioFactory)
}
