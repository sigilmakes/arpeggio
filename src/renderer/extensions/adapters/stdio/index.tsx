import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * JSON STDIO adapter — spawns a subprocess and communicates via
 * JSON messages over stdin/stdout, one JSON object per line.
 */
class JsonStdioAdapter implements AgentAdapterInstance {
    private id: string
    private command: string
    private args: string[]
    private cwd?: string
    private messageHandler?: (message: string) => void
    private pendingResolve?: (value: string) => void
    private responseBuffer = ''
    private connected = false

    constructor(config: Record<string, unknown>) {
        this.id = `stdio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        this.command = (config.command as string) || 'echo'
        this.args = (config.args as string[]) || []
        this.cwd = config.cwd as string | undefined
    }

    async connect(): Promise<void> {
        if (!window.electron?.subprocess) {
            throw new Error('Subprocess API not available')
        }

        await window.electron.subprocess.spawn(this.id, this.command, this.args, this.cwd)
        this.connected = true

        // Listen for stdout
        window.electron.subprocess.onStdout((id, data) => {
            if (id !== this.id) return

            // Try to parse as JSON
            try {
                const parsed = JSON.parse(data)
                const text = parsed.content || parsed.message || parsed.text || parsed.result || JSON.stringify(parsed)
                if (this.pendingResolve) {
                    this.pendingResolve(text)
                    this.pendingResolve = undefined
                } else if (this.messageHandler) {
                    this.messageHandler(text)
                }
            } catch {
                // Not JSON — treat as plain text
                if (this.pendingResolve) {
                    this.pendingResolve(data)
                    this.pendingResolve = undefined
                } else if (this.messageHandler) {
                    this.messageHandler(data)
                }
            }
        })

        window.electron.subprocess.onError((id, error) => {
            if (id !== this.id) return
            console.error(`[STDIO:${this.id}] Error:`, error)
            this.connected = false
        })

        window.electron.subprocess.onExit((id, code) => {
            if (id !== this.id) return
            console.log(`[STDIO:${this.id}] Exited with code:`, code)
            this.connected = false
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

        // Send as JSON line
        const payload = JSON.stringify({ type: 'message', content: message })
        await window.electron.subprocess.write(this.id, payload)

        // Wait for response with timeout
        return new Promise<string>((resolve, reject) => {
            this.pendingResolve = resolve
            setTimeout(() => {
                if (this.pendingResolve === resolve) {
                    this.pendingResolve = undefined
                    reject(new Error('Response timeout (30s)'))
                }
            }, 30000)
        })
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler
    }
}

const stdioFactory: AgentAdapterFactory = {
    create(config) { return new JsonStdioAdapter(config) }
}

export default function activate(app: ArpeggioAPI): void {
    app.registerAgentAdapter('json-stdio', stdioFactory)

    app.registerAgentTemplate('pi', {
        displayName: 'Pi',
        adapter: 'json-stdio',
        detect: () => true,
        defaults: {
            command: 'pi',
            args: ['--json'],
        }
    })
}
