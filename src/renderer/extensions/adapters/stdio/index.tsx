import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * Pi RPC adapter — uses polling for stdout (event push through
 * contextBridge is unreliable).
 */
class PiRpcAdapter implements AgentAdapterInstance {
    private id: string
    private command: string
    private args: string[]
    private cwd?: string
    private messageHandler?: (message: string) => void
    private connected = false
    private pollTimer: ReturnType<typeof setInterval> | null = null

    // State
    private responseText = ''
    private responseQueue: { resolve: (text: string) => void; reject: (e: Error) => void }[] = []
    private rpcPending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
    private toolCalls: any[] = []

    constructor(config: Record<string, unknown>) {
        this.id = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        this.command = (config.command as string) || 'pi'
        this.args = (config.args as string[]) || ['--mode', 'rpc', '--continue']
        this.cwd = config.cwd as string | undefined
    }

    async connect(): Promise<void> {
        if (!window.electron?.subprocess) throw new Error('Subprocess API not available')

        await window.electron.subprocess.spawn(this.id, this.command, this.args, this.cwd)
        this.connected = true

        // Poll for stdout lines every 100ms
        this.pollTimer = setInterval(async () => {
            if (!this.connected) return
            try {
                const lines = await window.electron.subprocess.readStdout(this.id)
                for (const line of lines) {
                    this.onLine(line)
                }
            } catch {
                // Process may have exited
            }
        }, 100)

        // Also try event-based (works in some Electron configs)
        window.electron.subprocess.onStdout((id, line) => {
            if (id !== this.id) return
            this.onLine(line)
        })

        window.electron.subprocess.onExit((id, code) => {
            if (id !== this.id) return
            this.connected = false
            this.stopPolling()
            this.rejectAll(new Error(`Pi exited (${code})`))
        })
    }

    async disconnect(): Promise<void> {
        this.stopPolling()
        if (this.connected) {
            await window.electron.subprocess.kill(this.id)
            this.connected = false
        }
    }

    async send(message: string): Promise<string> {
        if (!this.connected) await this.connect()

        this.responseText = ''
        this.toolCalls = []

        return new Promise<string>((resolve, reject) => {
            this.responseQueue.push({ resolve, reject })
            this.rpc('prompt', { message, streamingBehavior: 'followUp' }).catch((err) => {
                const idx = this.responseQueue.findIndex((q) => q.resolve === resolve)
                if (idx >= 0) this.responseQueue.splice(idx, 1)
                reject(err)
            })
        })
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }

    private stopPolling(): void {
        if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
    }

    private rpc(type: string, params: Record<string, unknown> = {}): Promise<any> {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const line = JSON.stringify({ id, type, ...params })
        return new Promise((resolve, reject) => {
            this.rpcPending.set(id, { resolve, reject })
            window.electron.subprocess.write(this.id, line)
        })
    }

    private onLine(line: string): void {
        try { this.onEvent(JSON.parse(line)) } catch { /* not JSON */ }
    }

    private onEvent(event: any): void {
        // RPC ack
        if (event.type === 'response' && event.id && this.rpcPending.has(event.id)) {
            const p = this.rpcPending.get(event.id)!
            this.rpcPending.delete(event.id)
            event.success ? p.resolve(event.data) : p.reject(new Error(event.error ?? 'RPC error'))
            return
        }

        // Text streaming
        if (event.type === 'message_update') {
            const delta = event.assistantMessageEvent
            if (delta?.type === 'text_delta' && delta.delta) {
                this.responseText += delta.delta
                this.messageHandler?.(JSON.stringify({ type: 'streaming', content: this.responseText }))
            }
        }

        // Fallback text
        if (event.type === 'message_end' && event.message?.role === 'assistant' && !this.responseText) {
            const blocks = Array.isArray(event.message.content)
                ? event.message.content.filter((b: any) => b.type === 'text') : []
            this.responseText = blocks.map((b: any) => b.text).join('')
        }

        // Tool start
        if (event.type === 'tool_execution_start') {
            this.toolCalls.push({
                id: `tc-${Date.now()}-${this.toolCalls.length}`,
                name: event.toolName || 'tool',
                input: event.args ? JSON.stringify(event.args, null, 2) : '',
                status: 'running'
            })
        }

        // Tool end
        if (event.type === 'tool_execution_end') {
            const last = this.toolCalls[this.toolCalls.length - 1]
            if (last) {
                last.output = typeof event.result === 'string' ? event.result
                    : (event.result ? JSON.stringify(event.result, null, 2) : undefined)
                last.status = event.isError ? 'error' : 'done'
            }
        }

        // Turn complete
        if (event.type === 'agent_end') {
            const text = this.responseText.trim()
            this.responseText = ''
            const next = this.responseQueue.shift()
            if (next) {
                if (this.toolCalls.length > 0) {
                    next.resolve(JSON.stringify({
                        content: text || `Used ${this.toolCalls.length} tool(s)`,
                        toolCalls: this.toolCalls
                    }))
                } else {
                    next.resolve(text || '(no response)')
                }
                this.toolCalls = []
            }
        }
    }

    private rejectAll(err: Error): void {
        for (const { reject } of this.responseQueue) reject(err)
        this.responseQueue = []
        for (const [, { reject }] of this.rpcPending) reject(err)
        this.rpcPending.clear()
    }
}

const piFactory: AgentAdapterFactory = { create(config) { return new PiRpcAdapter(config) } }

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('json-stdio', piFactory)
    app.registerAgentTemplate('pi', {
        displayName: 'Pi',
        adapter: 'json-stdio',
        detect: () => true,
        defaults: { command: 'pi', args: ['--mode', 'rpc', '--continue'] }
    })
}
