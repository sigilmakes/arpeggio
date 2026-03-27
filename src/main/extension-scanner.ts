import { ipcMain, app } from 'electron'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import type { ExtensionManifest } from '../shared/types'

/**
 * Scans extension directories for user extensions.
 * Extensions can be:
 *   - A single .ts file: ~/.arpeggio/extensions/my-ext.ts
 *   - A directory with index.ts: ~/.arpeggio/extensions/my-ext/index.ts
 *
 * Same patterns apply for workspace-local: .arpeggio/extensions/
 */

export function registerExtensionScanner(): void {
    ipcMain.handle('extension:scan', async (_event, workspacePath?: string) => {
        const manifests: ExtensionManifest[] = []

        // Global extensions
        const globalDir = join(app.getPath('home'), '.arpeggio', 'extensions')
        const globalExts = await scanDirectory(globalDir)
        manifests.push(...globalExts)

        // Workspace-local extensions
        if (workspacePath) {
            const localDir = join(workspacePath, '.arpeggio', 'extensions')
            const localExts = await scanDirectory(localDir)
            manifests.push(...localExts)
        }

        return manifests
    })

    ipcMain.handle('extension:read-source', async (_event, entryPoint: string) => {
        const { readFile } = await import('fs/promises')
        return readFile(entryPoint, 'utf-8')
    })
}

async function scanDirectory(dir: string): Promise<ExtensionManifest[]> {
    const manifests: ExtensionManifest[] = []

    try {
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = join(dir, entry.name)

            if (entry.isFile() && entry.name.endsWith('.ts')) {
                // Single-file extension
                const id = `user.${entry.name.replace(/\.ts$/, '')}`
                manifests.push({
                    id,
                    name: entry.name.replace(/\.ts$/, ''),
                    version: '0.0.0',
                    entryPoint: fullPath,
                    builtIn: false
                })
            } else if (entry.isDirectory()) {
                // Directory extension — look for index.ts
                const indexPath = join(fullPath, 'index.ts')
                try {
                    const indexStat = await stat(indexPath)
                    if (indexStat.isFile()) {
                        manifests.push({
                            id: `user.${entry.name}`,
                            name: entry.name,
                            version: '0.0.0',
                            entryPoint: indexPath,
                            builtIn: false
                        })
                    }
                } catch {
                    // No index.ts, skip
                }
            }
        }
    } catch {
        // Directory doesn't exist, that's fine
    }

    return manifests
}
