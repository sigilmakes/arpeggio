import { ipcMain, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'

/**
 * Manages agent subprocesses. Each agent gets a spawned process
 * with stdin/stdout for JSON message passing.
 */

const processes = new Map<string, ChildProcess>()
const stdoutQueues = new Map<string, string[]>()
const stderrQueues = new Map<string, string[]>()

import { execFile } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(execFile)

export function registerSubprocessHandlers(): void {
    // List available pi models (pi writes to stderr)
    ipcMain.handle('pi:list-models', async () => {
        try {
            let output: string
            try {
                const result = await execAsync('pi', ['--list-models'], { timeout: 10000 })
                output = result.stdout || result.stderr
            } catch (err: any) {
                // execFile may "fail" with exit code but still have useful stderr
                output = err.stdout || err.stderr || ''
            }
            const lines = output.trim().split('\n').slice(1) // skip header
            return lines.filter(Boolean).map((line) => {
                const parts = line.trim().split(/\s{2,}/)
                return {
                    provider: parts[0] || '',
                    model: parts[1] || '',
                    context: parts[2] || '',
                    maxOut: parts[3] || '',
                    thinking: parts[4] === 'yes',
                    images: parts[5] === 'yes',
                }
            })
        } catch {
            return []
        }
    })
    // Check if an env var is set (for credential detection)
    ipcMain.handle('env:check', (_event, varName: string) => {
        return !!process.env[varName]
    })

    ipcMain.handle('env:get', (_event, varName: string) => {
        return process.env[varName] || null
    })
    ipcMain.handle('subprocess:spawn', async (_event, id: string, command: string, args: string[], cwd?: string) => {
        if (processes.has(id)) {
            throw new Error(`Process ${id} already running`)
        }

        try {
            const proc = spawn(command, args, {
                cwd: cwd || undefined,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
                shell: true
            })

            processes.set(id, proc)
            stdoutQueues.set(id, [])
            stderrQueues.set(id, [])

            // Buffer stdout lines for polling
            let stdoutBuffer = ''
            proc.stdout?.on('data', (data: Buffer) => {
                stdoutBuffer += data.toString()
                const lines = stdoutBuffer.split('\n')
                stdoutBuffer = lines.pop() ?? ''
                for (const line of lines) {
                    if (line.trim()) {
                        const queue = stdoutQueues.get(id)
                        if (queue) queue.push(line)
                        // Also try event push
                        sendToRenderer('subprocess:stdout', id, line)
                    }
                }
            })

            // Buffer stderr lines for polling
            let stderrBuffer = ''
            proc.stderr?.on('data', (data: Buffer) => {
                stderrBuffer += data.toString()
                const lines = stderrBuffer.split('\n')
                stderrBuffer = lines.pop() ?? ''
                for (const line of lines) {
                    if (line.trim()) {
                        const queue = stderrQueues.get(id)
                        if (queue) queue.push(line)
                        sendToRenderer('subprocess:stderr', id, line)
                    }
                }
            })

            proc.on('error', (err) => {
                sendToRenderer('subprocess:error', id, err.message)
                processes.delete(id)
            })

            proc.on('exit', (code, signal) => {
                sendToRenderer('subprocess:exit', id, `${code ?? signal}`)
                processes.delete(id)
            })

            return { pid: proc.pid }
        } catch (error) {
            throw new Error(`Failed to spawn ${command}: ${error}`)
        }
    })

    ipcMain.handle('subprocess:write', async (_event, id: string, data: string) => {
        const proc = processes.get(id)
        if (!proc?.stdin?.writable) {
            throw new Error(`Process ${id} stdin not writable`)
        }
        proc.stdin.write(data + '\n')
        return true
    })

    ipcMain.handle('subprocess:kill', async (_event, id: string) => {
        const proc = processes.get(id)
        if (proc) {
            proc.kill('SIGTERM')
            // Force kill after 5 seconds
            setTimeout(() => {
                if (processes.has(id)) {
                    proc.kill('SIGKILL')
                    processes.delete(id)
                }
            }, 5000)
        }
        return true
    })

    ipcMain.handle('subprocess:is-alive', async (_event, id: string) => {
        return processes.has(id)
    })

    // Buffered output — renderer polls this instead of relying on event push
    ipcMain.handle('subprocess:read-stdout', async (_event, id: string) => {
        const lines = stdoutQueues.get(id) ?? []
        stdoutQueues.set(id, [])
        return lines
    })

    ipcMain.handle('subprocess:read-stderr', async (_event, id: string) => {
        const lines = stderrQueues.get(id) ?? []
        stderrQueues.set(id, [])
        return lines
    })
}

function sendToRenderer(channel: string, id: string, data: string): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
        win.webContents.send(channel, id, data)
    }
}
