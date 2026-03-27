import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import { readdir, readFile, writeFile, stat, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/types'

function workspacesDir(): string {
    return join(app.getPath('home'), '.arpeggio', 'workspaces')
}

export function registerIpcHandlers(): void {
    // ── File System ────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.FS_READ_DIR, async (_event, dirPath: string) => {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true })
            return entries
                .map((entry) => ({
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    isFile: entry.isFile(),
                    path: join(dirPath, entry.name)
                }))
                .sort((a, b) => {
                    // Directories first, then alphabetical
                    if (a.isDirectory && !b.isDirectory) return -1
                    if (!a.isDirectory && b.isDirectory) return 1
                    return a.name.localeCompare(b.name)
                })
        } catch (error) {
            throw new Error(`Failed to read directory: ${dirPath}: ${error}`)
        }
    })

    ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_event, filePath: string) => {
        try {
            return await readFile(filePath, 'utf-8')
        } catch (error) {
            throw new Error(`Failed to read file: ${filePath}: ${error}`)
        }
    })

    ipcMain.handle(IPC_CHANNELS.FS_READ_FILE_BASE64, async (_event, filePath: string) => {
        try {
            const buffer = await readFile(filePath)
            return buffer.toString('base64')
        } catch (error) {
            throw new Error(`Failed to read file as base64: ${filePath}: ${error}`)
        }
    })

    ipcMain.handle(
        IPC_CHANNELS.FS_WRITE_FILE,
        async (_event, filePath: string, content: string) => {
            try {
                await writeFile(filePath, content, 'utf-8')
                return true
            } catch (error) {
                throw new Error(`Failed to write file: ${filePath}: ${error}`)
            }
        }
    )

    ipcMain.handle(IPC_CHANNELS.FS_STAT, async (_event, filePath: string) => {
        try {
            const stats = await stat(filePath)
            return {
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                size: stats.size,
                mtime: stats.mtimeMs,
                ctime: stats.ctimeMs
            }
        } catch (error) {
            throw new Error(`Failed to stat: ${filePath}: ${error}`)
        }
    })

    // ── App ────────────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.APP_GET_PATH, (_event, name: string) => {
        return app.getPath(name as Parameters<typeof app.getPath>[0])
    })

    // ── Dialog ─────────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        })
        if (result.canceled || result.filePaths.length === 0) return null
        return result.filePaths[0]
    })

    // ── Workspace ──────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, async () => {
        const dir = workspacesDir()
        try {
            const entries = await readdir(dir, { withFileTypes: true })
            const workspaces = []
            for (const entry of entries) {
                if (!entry.isDirectory()) continue
                try {
                    const configPath = join(dir, entry.name, 'workspace.json')
                    const content = await readFile(configPath, 'utf-8')
                    workspaces.push(JSON.parse(content))
                } catch {
                    // Skip workspaces with broken config
                }
            }
            return workspaces
        } catch {
            return []
        }
    })

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_CONFIG, async (_event, id: string) => {
        const configPath = join(workspacesDir(), id, 'workspace.json')
        try {
            const content = await readFile(configPath, 'utf-8')
            return JSON.parse(content)
        } catch (error) {
            throw new Error(`Failed to read workspace config: ${id}: ${error}`)
        }
    })

    ipcMain.handle(
        IPC_CHANNELS.WORKSPACE_CREATE,
        async (_event, config: { id: string; name: string; projectPaths: string[] }) => {
            const wsDir = join(workspacesDir(), config.id)
            await mkdir(wsDir, { recursive: true })
            await mkdir(join(wsDir, 'chat'), { recursive: true })
            await mkdir(join(wsDir, 'artifacts'), { recursive: true })

            const wsConfig = {
                id: config.id,
                name: config.name,
                projectPaths: config.projectPaths,
                agents: [],
                channels: [
                    {
                        id: 'general',
                        name: 'General',
                        agents: []
                    }
                ]
            }
            await writeFile(join(wsDir, 'workspace.json'), JSON.stringify(wsConfig, null, 4), 'utf-8')
            return wsConfig
        }
    )

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_event, id: string) => {
        const wsDir = join(workspacesDir(), id)
        try {
            await rm(wsDir, { recursive: true })
            return true
        } catch (error) {
            throw new Error(`Failed to delete workspace: ${id}: ${error}`)
        }
    })

    ipcMain.handle(
        IPC_CHANNELS.WORKSPACE_SAVE_STATE,
        async (_event, id: string, state: Record<string, unknown>) => {
            const statePath = join(workspacesDir(), id, 'state.json')
            await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8')
            return true
        }
    )

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_LOAD_STATE, async (_event, id: string) => {
        const statePath = join(workspacesDir(), id, 'state.json')
        try {
            const content = await readFile(statePath, 'utf-8')
            return JSON.parse(content)
        } catch {
            return null
        }
    })
}
