import type { ArpeggioAPI } from '../../../core/extension-api'
import type { AgentAdapterInstance, AgentAdapterFactory } from '../../../core/registry'

/**
 * Echo adapter — a test adapter that demonstrates all agent features:
 * - Basic text responses
 * - Tool call rendering (try: "use tools")
 * - Thinking blocks (try: "think about something")
 * - Streaming simulation
 */
class EchoAdapter implements AgentAdapterInstance {
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}

    async send(message: string): Promise<string> {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
        const lower = message.toLowerCase()

        // Demonstrate tool calls
        if (lower.includes('tool') || lower.includes('read') || lower.includes('edit') || lower.includes('run')) {
            return JSON.stringify({
                content: 'I used some tools to help with that.',
                toolCalls: [
                    {
                        id: `tc-${Date.now()}-1`,
                        name: 'Read',
                        input: JSON.stringify({ path: 'src/main/index.ts' }, null, 2),
                        output: 'import { app, BrowserWindow } from "electron"\n// ... 42 lines',
                        status: 'done'
                    },
                    {
                        id: `tc-${Date.now()}-2`,
                        name: 'Edit',
                        input: JSON.stringify({ path: 'src/main/index.ts', oldText: 'foo', newText: 'bar' }, null, 2),
                        output: 'Successfully replaced text.',
                        status: 'done'
                    }
                ]
            })
        }

        // Demonstrate thinking blocks
        if (lower.includes('think') || lower.includes('reason') || lower.includes('explain')) {
            return JSON.stringify({
                content: 'After thinking about it, the answer is 42.',
                thinking: {
                    content: 'Let me think about this step by step.\n\nFirst, I need to consider the question.\nThe user asked me to think about something.\n\nThe answer to life, the universe, and everything is famously 42.\nThis comes from The Hitchhiker\'s Guide to the Galaxy by Douglas Adams.\n\nI\'m confident in this answer.',
                    durationMs: 1250
                }
            })
        }

        // Demonstrate error
        if (lower.includes('error') || lower.includes('fail')) {
            throw new Error('Simulated agent error — this is a test!')
        }

        // Default echo
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
