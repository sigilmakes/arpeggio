import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * Pi RPC adapter — communicates via JSON-RPC over stdin/stdout.
 * 
 * Protocol (from nest/src/bridge.ts):
 *   Send: { id, type: "prompt", message, streamingBehavior: "followUp" }
 *   Receive events:
 *     message_update { assistantMessageEvent: { type: "text_delta", delta } }
 *     tool_execution_start { toolName, args }
 *     tool_execution_end { toolName, result, isError }
 *     agent_end — turn complete, resolve promise
 *     response { id, success, data } — RPC ack
 */
class PiRpcAdapter implements AgentAdapterInstance {
    private id: string
    private command: string
    private args: string[]
    private cwd?: string
    private messageHandler?: (message: string) => void
    private connected = false

    // RPC state
    private rpcPending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
    private responseText = ''
    private responseQueue: { resolve: (text: string) => void; reject: (e: Error) => void }[] = []
    private toolCalls: any[] = []
    private currentToolName = ''

    constructor(config: Record<string, unknown>) {
        this.id = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        this.command = (config.command as string) || 'pi'
        this.args = (config.args as string[]) || ['--mode', 'rpc', '--continue']
        this.cwd = config.cwd as string | undefined
    }

    async connect(): Promise<void> {
        if (!window.electron?.subprocess) {
            throw new Error('Subprocess API not available')
        }

        await window.electron.subprocess.spawn(this.id, this.command, this.args, this.cwd)
        this.connected = true

        window.electron.subprocess.onStdout((id, line) => {
            if (id !== this.id) return
            this.onLine(line)
        })

        window.electron.subprocess.onStderr((id, line) => {
            if (id !== this.id) return
            console.warn(`[Pi stderr] ${line}`)
        })

        window.electron.subprocess.onError((id, error) => {
            if (id !== this.id) return
            console.error(`[Pi] Error:`, error)
            this.connected = false
            this.rejectAll(new Error(error))
        })

        window.electron.subprocess.onExit((id, code) => {
            if (id !== this.id) return
            console.log(`[Pi] Exited:`, code)
            this.connected = false
            this.rejectAll(new Error(`Pi exited (${code})`))
        })
    }

    async disconnect(): Promise<void> {
        if (this.connected) {
            await window.electron.subprocess.kill(this.id)
            this.connected = false
        }
    }

    async send(message: string): Promise<string> {
        if (!this.connected) {
            await this.connect()
        }

        this.responseText = ''
        this.toolCalls = []

        return new Promise<string>((resolve, reject) => {
            this.responseQueue.push({ resolve, reject })

            // Send RPC prompt command
            this.rpc('prompt', {
                message,
                streamingBehavior: 'followUp'
            }).catch((err) => {
                const idx = this.responseQueue.findIndex((q) => q.resolve === resolve)
                if (idx >= 0) this.responseQueue.splice(idx, 1)
                reject(err)
            })
        })
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }

    private rpc(type: string, params: Record<string, unknown> = {}): Promise<any> {
        const id = crypto.randomUUID()
        const line = JSON.stringify({ id, type, ...params })
        return new Promise((resolve, reject) => {
            this.rpcPending.set(id, { resolve, reject })
            window.electron.subprocess.write(this.id, line)
        })
    }

    private onLine(line: string): void {
        try {
            const event = JSON.parse(line)
            this.onEvent(event)
        } catch {
            // not JSON
        }
    }

    private onEvent(event: any): void {
        // RPC response
        if (event.type === 'response' && event.id && this.rpcPending.has(event.id)) {
            const pending = this.rpcPending.get(event.id)!
            this.rpcPending.delete(event.id)
            event.success ? pending.resolve(event.data) : pending.reject(new Error(event.error ?? 'RPC error'))
            return
        }

        // Streaming text deltas
        if (event.type === 'message_update') {
            const delta = event.assistantMessageEvent
            if (delta?.type === 'text_delta' && delta.delta) {
                this.responseText += delta.delta
                // Stream to UI
                this.messageHandler?.(JSON.stringify({
                    type: 'streaming',
                    content: this.responseText
                }))
            }
        }

        // Fallback text from message_end
        if (event.type === 'message_end') {
            const msg = event.message
            if (msg?.role === 'assistant' && !this.responseText) {
                const blocks = Array.isArray(msg.content)
                    ? msg.content.filter((b: any) => b.type === 'text')
                    : []
                this.responseText = blocks.map((b: any) => b.text).join('')
            }
        }

        // Tool start
        if (event.type === 'tool_execution_start') {
            this.currentToolName = event.toolName || 'tool'
            this.toolCalls.push({
                id: `tc-${Date.now()}-${this.toolCalls.length}`,
                name: this.currentToolName,
                input: event.args ? JSON.stringify(event.args, null, 2) : '',
                output: undefined,
                status: 'running'
            })
        }

        // Tool end
        if (event.type === 'tool_execution_end') {
            const last = this.toolCalls[this.toolCalls.length - 1]
            if (last) {
                last.output = typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)
                last.status = event.isError ? 'error' : 'done'
            }
        }

        // Agent done — resolve
        if (event.type === 'agent_end') {
            const text = this.responseText.trim()
            this.responseText = ''

            const next = this.responseQueue.shift()
            if (next) {
                // Build structured response if we have tool calls
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

const piFactory: AgentAdapterFactory = {
    create(config) { return new PiRpcAdapter(config) }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('json-stdio', piFactory)

    app.registerAgentTemplate('pi', {
        displayName: 'Pi',
        adapter: 'json-stdio',
        detect: () => true,
        defaults: {
            command: 'pi',
            args: ['--mode', 'rpc', '--continue'],
        }
    })
}
