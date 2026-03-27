import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

async function git(cwd: string, ...args: string[]): Promise<string> {
    try {
        const { stdout } = await exec('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 })
        return stdout.trim()
    } catch (error: any) {
        if (error.stderr) return error.stderr.trim()
        throw error
    }
}

export function registerGitHandlers(): void {
    ipcMain.handle('git:is-repo', async (_event, cwd: string) => {
        try {
            await git(cwd, 'rev-parse', '--is-inside-work-tree')
            return true
        } catch {
            return false
        }
    })

    ipcMain.handle('git:status', async (_event, cwd: string) => {
        const branch = await git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').catch(() => '(detached)')
        const statusRaw = await git(cwd, 'status', '--porcelain', '-uall')
        const files = statusRaw
            .split('\n')
            .filter(Boolean)
            .map((line) => ({
                status: line.slice(0, 2).trim(),
                path: line.slice(3)
            }))
        return { branch, files }
    })

    ipcMain.handle('git:diff', async (_event, cwd: string, filePath?: string) => {
        const args = ['diff']
        if (filePath) args.push('--', filePath)
        return await git(cwd, ...args)
    })

    ipcMain.handle('git:diff-staged', async (_event, cwd: string, filePath?: string) => {
        const args = ['diff', '--cached']
        if (filePath) args.push('--', filePath)
        return await git(cwd, ...args)
    })

    ipcMain.handle('git:stage', async (_event, cwd: string, paths: string[]) => {
        await git(cwd, 'add', '--', ...paths)
        return true
    })

    ipcMain.handle('git:unstage', async (_event, cwd: string, paths: string[]) => {
        await git(cwd, 'reset', 'HEAD', '--', ...paths)
        return true
    })

    ipcMain.handle('git:commit', async (_event, cwd: string, message: string) => {
        return await git(cwd, 'commit', '-m', message)
    })

    ipcMain.handle('git:log', async (_event, cwd: string, limit: number = 20) => {
        const raw = await git(cwd, 'log', `--max-count=${limit}`, '--format=%H|%h|%s|%an|%ai')
        return raw.split('\n').filter(Boolean).map((line) => {
            const [hash, short, subject, author, date] = line.split('|')
            return { hash, short, subject, author, date }
        })
    })

    ipcMain.handle('git:branches', async (_event, cwd: string) => {
        const raw = await git(cwd, 'branch', '-a', '--format=%(refname:short)|%(HEAD)')
        return raw.split('\n').filter(Boolean).map((line) => {
            const [name, head] = line.split('|')
            return { name, current: head === '*' }
        })
    })

    ipcMain.handle('git:checkout', async (_event, cwd: string, branch: string) => {
        return await git(cwd, 'checkout', branch)
    })

    ipcMain.handle('git:show', async (_event, cwd: string, hash: string) => {
        return await git(cwd, 'show', '--stat', '--patch', hash)
    })

    ipcMain.handle('git:create-branch', async (_event, cwd: string, name: string) => {
        return await git(cwd, 'checkout', '-b', name)
    })
}
