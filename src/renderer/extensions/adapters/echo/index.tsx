import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * Echo adapter — a test adapter that echoes back messages.
 * Useful for testing the chat system without a real agent.
 */

class EchoAdapter implements AgentAdapterInstance {
    private messageHandler?: (message: string) => void

    async connect(): Promise<void> {
        // Nothing to connect
    }

    async disconnect(): Promise<void> {
        // Nothing to disconnect
    }

    async send(message: string): Promise<string> {
        // Simulate a small delay
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
        return message
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const echoFactory: AgentAdapterFactory = {
    create() {
        return new EchoAdapter()
    }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('echo', echoFactory)

    app.registerAgentTemplate('echo', {
        displayName: 'Echo (Test)',
        adapter: 'echo',
        detect: () => true, // always available
        defaults: {}
    })
}
