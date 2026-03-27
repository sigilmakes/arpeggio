import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

class EchoAdapter implements AgentAdapterInstance {
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}
    async send(message: string): Promise<string> {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
        return message
    }
    onMessage(): void {}
}

const echoFactory: AgentAdapterFactory = {
    create() { return new EchoAdapter() }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('echo', echoFactory)
    app.registerAgentTemplate('echo', {
        displayName: 'Echo (Test)',
        adapter: 'echo',
        detect: () => true,
        defaults: {}
    })
}
