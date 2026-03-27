import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * JSON STDIO adapter — communicates with agents via JSON messages over stdin/stdout.
 * Used by pi.
 */
class JsonStdioAdapter implements AgentAdapterInstance {
    private messageHandler?: (message: string) => void

    async connect(): Promise<void> {
        // TODO: IPC to main process to spawn subprocess
        console.log('[STDIO] Connected')
    }

    async disconnect(): Promise<void> {
        // TODO: IPC to main process to kill subprocess
        console.log('[STDIO] Disconnected')
    }

    async send(message: string): Promise<string> {
        // TODO: IPC to main process to write JSON to stdin, read from stdout
        console.log('[STDIO] Send:', message.slice(0, 80))
        return '[JSON STDIO adapter: connection not yet implemented — use Echo for testing]'
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const stdioFactory: AgentAdapterFactory = {
    create() { return new JsonStdioAdapter() }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('json-stdio', stdioFactory)

    app.registerAgentTemplate('pi', {
        displayName: 'Pi',
        adapter: 'json-stdio',
        detect: () => true,
        defaults: {}
    })
}
