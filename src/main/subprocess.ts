import { ipcMain, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'

/**
 * Manages agent subprocesses. Each agent gets a spawned process
 * with stdin/stdout for JSON message passing.
 */

const processes = new Map<string, ChildProcess>()

export function registerSubprocessHandlers(): void {
    ipcMain.handle('subprocess:spawn', async (_event, id: string, command: string, args: string[], cwd?: string) => {
        if (processes.has(id)) {
            throw new Error(`Process ${id} already running`)
        }

        try {
            const proc = spawn(command, args, {
                cwd: cwd || undefined,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
                shell: false
            })

            processes.set(id, proc)

            // Forward stdout lines to renderer
            let stdoutBuffer = ''
            proc.stdout?.on('data', (data: Buffer) => {
                stdoutBuffer += data.toString()
                const lines = stdoutBuffer.split('\n')
                stdoutBuffer = lines.pop() ?? ''
                for (const line of lines) {
                    if (line.trim()) {
                        sendToRenderer('subprocess:stdout', id, line)
                    }
                }
            })

            // Forward stderr lines to renderer
            let stderrBuffer = ''
            proc.stderr?.on('data', (data: Buffer) => {
                stderrBuffer += data.toString()
                const lines = stderrBuffer.split('\n')
                stderrBuffer = lines.pop() ?? ''
                for (const line of lines) {
                    if (line.trim()) {
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
}

function sendToRenderer(channel: string, id: string, data: string): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
        win.webContents.send(channel, id, data)
    }
}
