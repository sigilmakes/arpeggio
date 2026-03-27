import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * Pi RPC adapter — streams structured events to the UI so thinking blocks,
 * tool calls, and text all render incrementally.
 *
 * Events sent via onMessage:
 *   { type: 'text', content }         — accumulated text so far
 *   { type: 'thinking_start' }
 *   { type: 'thinking_delta', content } — accumulated thinking so far
 *   { type: 'thinking_end', content, durationMs }
 *   { type: 'tool_start', id, name, input }
 *   { type: 'tool_end', id, name, output, status }
 *   { type: 'done', content, thinking, toolCalls } — final structured result
 */
class PiRpcAdapter implements AgentAdapterInstance {
    private id: string
    private command: string
    private args: string[]
    private cwd?: string
    private messageHandler?: (message: string) => void
    private connected = false
    private pollTimer: ReturnType<typeof setInterval> | null = null

    private responseText = ''
    private thinkingText = ''
    private thinkingStart = 0
    private responseQueue: { resolve: (text: string) => void; reject: (e: Error) => void }[] = []
    private rpcPending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
    private toolCalls: any[] = []
    private seenLines = new Set<string>()

    constructor(config: Record<string, unknown>) {
        this.id = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        this.command = (config.command as string) || 'pi'
        this.args = (config.args as string[]) || ['--mode', 'rpc']
        this.cwd = config.cwd as string | undefined
    }

    async connect(): Promise<void> {
        if (!window.electron?.subprocess) throw new Error('Subprocess API not available')
        await window.electron.subprocess.spawn(this.id, this.command, this.args, this.cwd)
        this.connected = true

        this.pollTimer = setInterval(async () => {
            if (!this.connected) return
            try {
                const lines = await window.electron.subprocess.readStdout(this.id)
                for (const line of lines) {
                    if (this.seenLines.has(line)) continue
                    this.seenLines.add(line)
                    this.onLine(line)
                }
                // Prevent unbounded memory growth
                if (this.seenLines.size > 5000) this.seenLines.clear()
            } catch { /* process may have exited */ }
        }, 100)

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
        this.thinkingText = ''
        this.thinkingStart = 0
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

    private emit(event: Record<string, unknown>): void {
        this.messageHandler?.(JSON.stringify(event))
    }

    private stopPolling(): void {
        if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
    }

    private rpc(type: string, params: Record<string, unknown> = {}): Promise<any> {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        return new Promise((resolve, reject) => {
            this.rpcPending.set(id, { resolve, reject })
            window.electron.subprocess.write(this.id, JSON.stringify({ id, type, ...params }))
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

        if (event.type === 'message_update') {
            const ame = event.assistantMessageEvent
            if (!ame) return

            // Text streaming
            if (ame.type === 'text_delta' && ame.delta) {
                this.responseText += ame.delta
                this.emit({ type: 'text', content: this.responseText })
            }

            // Thinking streaming
            if (ame.type === 'thinking_start' || (ame.type === 'thinking_delta' && !this.thinkingStart)) {
                this.thinkingStart = Date.now()
                this.thinkingText = ''
                this.emit({ type: 'thinking_start' })
            }
            if (ame.type === 'thinking_delta' && ame.delta) {
                this.thinkingText += ame.delta
                this.emit({ type: 'thinking_delta', content: this.thinkingText })
            }
            if (ame.type === 'thinking_end') {
                this.emit({
                    type: 'thinking_end',
                    content: this.thinkingText,
                    durationMs: Date.now() - this.thinkingStart
                })
            }
        }

        // Fallback text from message_end
        if (event.type === 'message_end' && event.message?.role === 'assistant' && !this.responseText) {
            const blocks = Array.isArray(event.message.content)
                ? event.message.content.filter((b: any) => b.type === 'text') : []
            this.responseText = blocks.map((b: any) => b.text).join('')
            if (this.responseText) {
                this.emit({ type: 'text', content: this.responseText })
            }
        }

        // Tool start — stream immediately
        if (event.type === 'tool_execution_start') {
            const tc = {
                id: `tc-${Date.now()}-${this.toolCalls.length}`,
                name: event.toolName || 'tool',
                input: event.args ? JSON.stringify(event.args, null, 2) : '',
                status: 'running'
            }
            this.toolCalls.push(tc)
            this.emit({ type: 'tool_start', ...tc })
        }

        // Tool end — stream immediately
        if (event.type === 'tool_execution_end') {
            const last = this.toolCalls[this.toolCalls.length - 1]
            if (last) {
                last.output = typeof event.result === 'string' ? event.result
                    : (event.result ? JSON.stringify(event.result, null, 2) : undefined)
                last.status = event.isError ? 'error' : 'done'
                this.emit({ type: 'tool_end', ...last })
            }
        }

        // Done
        if (event.type === 'agent_end') {
            const text = this.responseText.trim()
            this.responseText = ''
            const next = this.responseQueue.shift()
            if (next) {
                const result: any = { content: text || '(no response)' }
                if (this.thinkingText) {
                    result.thinking = {
                        content: this.thinkingText,
                        durationMs: this.thinkingStart ? Date.now() - this.thinkingStart : undefined
                    }
                }
                if (this.toolCalls.length > 0) {
                    result.toolCalls = this.toolCalls
                }
                this.thinkingText = ''
                this.thinkingStart = 0
                this.toolCalls = []
                next.resolve(JSON.stringify(result))
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
        defaults: { command: 'pi', args: ['--mode', 'rpc'] }
    })
}
