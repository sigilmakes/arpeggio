/**
 * Global agent stats store — adapters write, panels read.
 */

export interface AgentStats {
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
    contextUsed: number
}

const stats = new Map<string, AgentStats>()
const listeners = new Set<() => void>()

export function setAgentStats(agentId: string, update: Partial<AgentStats>): void {
    const current = stats.get(agentId) ?? {
        model: '', inputTokens: 0, outputTokens: 0, cost: 0, contextUsed: 0
    }
    stats.set(agentId, { ...current, ...update })
    listeners.forEach((fn) => fn())
}

export function getAgentStats(agentId: string): AgentStats | undefined {
    return stats.get(agentId)
}

export function onStatsChange(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
}
