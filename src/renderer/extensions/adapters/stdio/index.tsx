import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * JSON STDIO adapter for pi.
 * 
 * Protocol: send plain text to stdin, receive JSONL events on stdout.
 * Key events:
 *   message_update { assistantMessageEvent: { type: "text_delta", delta: "..." } }
 *   message_end { message: { role: "assistant", content: [...] } }
 *   turn_end { toolResults: [...] }
 */
class PiStdioAdapter implements AgentAdapterInstance {
    private id: string
    private command: string
    private args: string[]
    private cwd?: string
    private messageHandler?: (message: string) => void
    private connected = false
    private responseChunks: string[] = []
    private toolResults: any[] = []
    private thinkingContent = ''
    private thinkingStart = 0
    private pendingResolve?: (value: string) => void

    constructor(config: Record<string, unknown>) {
        this.id = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        this.command = (config.command as string) || 'pi'
        this.args = (config.args as string[]) || ['--mode', 'json']
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
            this.handleLine(line)
        })

        window.electron.subprocess.onError((id, error) => {
            if (id !== this.id) return
            console.error(`[Pi:${this.id}] Error:`, error)
            this.connected = false
            if (this.pendingResolve) {
                this.pendingResolve(`[Error: ${error}]`)
                this.pendingResolve = undefined
            }
        })

        window.electron.subprocess.onExit((id, code) => {
            if (id !== this.id) return
            this.connected = false
            if (this.pendingResolve) {
                this.pendingResolve(this.buildResponse())
                this.pendingResolve = undefined
            }
        })
    }

    private handleLine(line: string): void {
        try {
            const event = JSON.parse(line)
            
            switch (event.type) {
                case 'message_update': {
                    const ame = event.assistantMessageEvent
                    if (ame?.type === 'text_delta' && ame.delta) {
                        this.responseChunks.push(ame.delta)
                        // Stream partial content to UI
                        this.messageHandler?.(JSON.stringify({
                            type: 'streaming',
                            content: this.responseChunks.join('')
                        }))
                    }
                    if (ame?.type === 'thinking_delta' && ame.delta) {
                        this.thinkingContent += ame.delta
                    }
                    if (ame?.type === 'thinking_start') {
                        this.thinkingStart = Date.now()
                        this.thinkingContent = ''
                    }
                    break
                }

                case 'tool_use_start': {
                    // Tool call started
                    this.messageHandler?.(JSON.stringify({
                        type: 'tool_start',
                        name: event.name || event.toolName || 'tool',
                        input: event.input || ''
                    }))
                    break
                }

                case 'turn_end': {
                    if (event.toolResults) {
                        this.toolResults = event.toolResults
                    }
                    // Turn complete — resolve the promise
                    if (this.pendingResolve) {
                        this.pendingResolve(this.buildResponse())
                        this.pendingResolve = undefined
                    }
                    break
                }

                case 'agent_end': {
                    // Session complete
                    if (this.pendingResolve) {
                        this.pendingResolve(this.buildResponse())
                        this.pendingResolve = undefined
                    }
                    break
                }
            }
        } catch {
            // Not JSON — ignore
        }
    }

    private buildResponse(): string {
        const content = this.responseChunks.join('').trim()
        const result: any = { content: content || '(no response)' }

        // Add thinking if present
        if (this.thinkingContent) {
            result.thinking = {
                content: this.thinkingContent,
                durationMs: this.thinkingStart ? Date.now() - this.thinkingStart : undefined,
            }
        }

        // Add tool calls if present
        if (this.toolResults.length > 0) {
            result.toolCalls = this.toolResults.map((tr: any, i: number) => ({
                id: `tc-${Date.now()}-${i}`,
                name: tr.name || tr.toolName || 'tool',
                input: typeof tr.input === 'string' ? tr.input : JSON.stringify(tr.input, null, 2),
                output: typeof tr.output === 'string' ? tr.output : (tr.output ? JSON.stringify(tr.output, null, 2) : undefined),
                status: tr.error ? 'error' : 'done'
            }))
        }

        // Reset for next message
        this.responseChunks = []
        this.toolResults = []
        this.thinkingContent = ''
        this.thinkingStart = 0

        // If only content, return plain string. If has extras, return JSON
        if (!result.thinking && !result.toolCalls) {
            return content || '(no response)'
        }
        return JSON.stringify(result)
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

        // Pi expects plain text on stdin
        await window.electron.subprocess.write(this.id, message)

        return new Promise<string>((resolve, reject) => {
            this.pendingResolve = resolve
            setTimeout(() => {
                if (this.pendingResolve === resolve) {
                    this.pendingResolve = undefined
                    // Return whatever we have so far rather than erroring
                    const partial = this.buildResponse()
                    resolve(partial || '(response timeout)')
                }
            }, 120000) // 2 minute timeout for pi
        })
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const piFactory: AgentAdapterFactory = {
    create(config) { return new PiStdioAdapter(config) }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('json-stdio', piFactory)

    app.registerAgentTemplate('pi', {
        displayName: 'Pi',
        adapter: 'json-stdio',
        detect: () => true,
        defaults: {
            command: 'pi',
            args: ['--mode', 'json'],
        }
    })
}
