import type { AgentConfig, AgentStatus, AgentContext, AgentMessage } from '@shared/agent-types'
import type { AgentAdapterInstance } from './registry'
import { EventBus } from './event-bus'
import { ExtensionRegistry } from './registry'

export interface ManagedAgent {
    config: AgentConfig
    adapter: AgentAdapterInstance | null
    status: AgentStatus
    onMessage?: (msg: AgentMessage) => void
}

/**
 * Manages agent lifecycle — spin up, spin down, message routing.
 */
export class AgentManager {
    private agents = new Map<string, ManagedAgent>()

    constructor(
        private registry: ExtensionRegistry,
        private eventBus: EventBus
    ) {}

    addAgent(config: AgentConfig): void {
        this.agents.set(config.id, {
            config,
            adapter: null,
            status: 'inactive'
        })
    }

    removeAgent(id: string): void {
        const agent = this.agents.get(id)
        if (agent?.adapter) {
            agent.adapter.disconnect().catch(() => {})
        }
        this.agents.delete(id)
    }

    async connectAgent(id: string, context: AgentContext): Promise<void> {
        const agent = this.agents.get(id)
        if (!agent) throw new Error(`Agent not found: ${id}`)

        const adapterEntry = this.registry.getAgentAdapter(agent.config.adapter)
        if (!adapterEntry) throw new Error(`No adapter for protocol: ${agent.config.adapter}`)

        agent.status = 'connecting'
        this.notifyStatus(id, 'connecting')

        try {
            const instance = adapterEntry.factory.create(agent.config.config)
            await instance.connect()
            agent.adapter = instance
            agent.status = 'active'
            this.notifyStatus(id, 'active')

            // Wire up message handler
            if (instance.onMessage && agent.onMessage) {
                instance.onMessage((raw) => {
                    const msg: AgentMessage = { type: 'text', content: raw }
                    agent.onMessage?.(msg)
                })
            }
        } catch (error) {
            agent.status = 'error'
            this.notifyStatus(id, 'error')
            throw error
        }
    }

    async disconnectAgent(id: string): Promise<void> {
        const agent = this.agents.get(id)
        if (!agent) return
        if (agent.adapter) {
            await agent.adapter.disconnect()
            agent.adapter = null
        }
        agent.status = 'inactive'
        this.notifyStatus(id, 'inactive')
    }

    async sendToAgent(id: string, message: string): Promise<string | null> {
        const agent = this.agents.get(id)
        if (!agent?.adapter || agent.status !== 'active') return null
        return agent.adapter.send(message)
    }

    setMessageHandler(id: string, handler: (msg: AgentMessage) => void): void {
        const agent = this.agents.get(id)
        if (agent) agent.onMessage = handler
    }

    getAgent(id: string): ManagedAgent | undefined {
        return this.agents.get(id)
    }

    getAllAgents(): ManagedAgent[] {
        return [...this.agents.values()]
    }

    getStatus(id: string): AgentStatus {
        return this.agents.get(id)?.status ?? 'inactive'
    }

    private notifyStatus(id: string, status: AgentStatus): void {
        if (status === 'active') {
            this.eventBus.emit('agent:connected', { agentId: id })
        } else if (status === 'inactive') {
            this.eventBus.emit('agent:disconnected', { agentId: id })
        }
    }
}
