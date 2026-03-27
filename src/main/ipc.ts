import { ipcMain, app } from 'electron'
import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/types'

export function registerIpcHandlers(): void {
    // ── File System ────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.FS_READ_DIR, async (_event, dirPath: string) => {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true })
            return entries.map((entry) => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                isFile: entry.isFile(),
                path: join(dirPath, entry.name)
            }))
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

    // ── Workspace ──────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, async () => {
        const arpeggioDir = join(app.getPath('home'), '.arpeggio', 'workspaces')
        try {
            const entries = await readdir(arpeggioDir, { withFileTypes: true })
            return entries.filter((e) => e.isDirectory()).map((e) => e.name)
        } catch {
            return []
        }
    })

    ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_CONFIG, async (_event, name: string) => {
        const configPath = join(
            app.getPath('home'),
            '.arpeggio',
            'workspaces',
            name,
            'workspace.json'
        )
        try {
            const content = await readFile(configPath, 'utf-8')
            return JSON.parse(content)
        } catch (error) {
            throw new Error(`Failed to read workspace config: ${name}: ${error}`)
        }
    })
}
