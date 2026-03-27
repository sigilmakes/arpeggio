import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

export interface ElectronAPI {
    fs: {
        readDir: (path: string) => Promise<DirEntry[]>
        readFile: (path: string) => Promise<string>
        readFileBase64: (path: string) => Promise<string>
        writeFile: (path: string, content: string) => Promise<boolean>
        stat: (path: string) => Promise<FileStat>
    }
    workspace: {
        list: () => Promise<unknown[]>
        getConfig: (id: string) => Promise<unknown>
        create: (config: { id: string; name: string; projectPaths: string[] }) => Promise<unknown>
        delete: (id: string) => Promise<boolean>
        saveState: (id: string, state: Record<string, unknown>) => Promise<boolean>
        loadState: (id: string) => Promise<unknown>
    }
    chat: {
        readMessages: (workspaceId: string, channelId: string, limit?: number) => Promise<unknown[]>
        appendMessage: (workspaceId: string, channelId: string, message: unknown) => Promise<boolean>
        listChannels: (workspaceId: string) => Promise<string[]>
    }
    git: {
        isRepo: (cwd: string) => Promise<boolean>
        status: (cwd: string) => Promise<{ branch: string; files: { status: string; path: string }[] }>
        diff: (cwd: string, filePath?: string) => Promise<string>
        diffStaged: (cwd: string, filePath?: string) => Promise<string>
        stage: (cwd: string, paths: string[]) => Promise<boolean>
        unstage: (cwd: string, paths: string[]) => Promise<boolean>
        commit: (cwd: string, message: string) => Promise<string>
        log: (cwd: string, limit?: number) => Promise<{ hash: string; short: string; subject: string; author: string; date: string }[]>
        branches: (cwd: string) => Promise<{ name: string; current: boolean }[]>
        checkout: (cwd: string, branch: string) => Promise<string>
        show: (cwd: string, hash: string) => Promise<string>
        createBranch: (cwd: string, name: string) => Promise<string>
    }
    env: {
        check: (varName: string) => Promise<boolean>
        get: (varName: string) => Promise<string | null>
    }
    subprocess: {
        spawn: (id: string, command: string, args: string[], cwd?: string) => Promise<{ pid: number }>
        write: (id: string, data: string) => Promise<boolean>
        kill: (id: string) => Promise<boolean>
        isAlive: (id: string) => Promise<boolean>
        onStdout: (handler: (id: string, data: string) => void) => void
        onStderr: (handler: (id: string, data: string) => void) => void
        onError: (handler: (id: string, error: string) => void) => void
        onExit: (handler: (id: string, code: string) => void) => void
    }
    dialog: {
        openDirectory: () => Promise<string | null>
    }
    extensions: {
        scan: (workspacePath?: string) => Promise<unknown[]>
        readSource: (entryPoint: string) => Promise<string>
    }
    app: {
        getPath: (name: string) => Promise<string>
    }
    window: {
        minimize: () => void
        maximize: () => void
        close: () => void
    }
}

interface DirEntry {
    name: string
    isDirectory: boolean
    isFile: boolean
    path: string
}

interface FileStat {
    isDirectory: boolean
    isFile: boolean
    size: number
    mtime: number
    ctime: number
}

// Bridge subprocess IPC events to DOM CustomEvents
// (contextBridge can't reliably proxy ipcRenderer.on callbacks)
ipcRenderer.on('subprocess:stdout', (_e, id, data) => {
    window.dispatchEvent(new CustomEvent('subprocess-stdout', { detail: { id, data } }))
})
ipcRenderer.on('subprocess:stderr', (_e, id, data) => {
    window.dispatchEvent(new CustomEvent('subprocess-stderr', { detail: { id, data } }))
})
ipcRenderer.on('subprocess:error', (_e, id, data) => {
    window.dispatchEvent(new CustomEvent('subprocess-error', { detail: { id, data } }))
})
ipcRenderer.on('subprocess:exit', (_e, id, data) => {
    window.dispatchEvent(new CustomEvent('subprocess-exit', { detail: { id, data } }))
})

const api: ElectronAPI = {
    fs: {
        readDir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIR, path),
        readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, path),
        readFileBase64: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE_BASE64, path),
        writeFile: (path: string, content: string) =>
            ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
        stat: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path)
    },
    workspace: {
        list: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST),
        getConfig: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CONFIG, id),
        create: (config) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, config),
        delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id),
        saveState: (id: string, state: Record<string, unknown>) =>
            ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SAVE_STATE, id, state),
        loadState: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LOAD_STATE, id)
    },
    chat: {
        readMessages: (workspaceId: string, channelId: string, limit?: number) =>
            ipcRenderer.invoke(IPC_CHANNELS.CHAT_READ_MESSAGES, workspaceId, channelId, limit),
        appendMessage: (workspaceId: string, channelId: string, message: unknown) =>
            ipcRenderer.invoke(IPC_CHANNELS.CHAT_APPEND_MESSAGE, workspaceId, channelId, message),
        listChannels: (workspaceId: string) =>
            ipcRenderer.invoke(IPC_CHANNELS.CHAT_LIST_CHANNELS, workspaceId),
    },
    git: {
        isRepo: (cwd: string) => ipcRenderer.invoke('git:is-repo', cwd),
        status: (cwd: string) => ipcRenderer.invoke('git:status', cwd),
        diff: (cwd: string, filePath?: string) => ipcRenderer.invoke('git:diff', cwd, filePath),
        diffStaged: (cwd: string, filePath?: string) => ipcRenderer.invoke('git:diff-staged', cwd, filePath),
        stage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:stage', cwd, paths),
        unstage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:unstage', cwd, paths),
        commit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', cwd, message),
        log: (cwd: string, limit?: number) => ipcRenderer.invoke('git:log', cwd, limit),
        branches: (cwd: string) => ipcRenderer.invoke('git:branches', cwd),
        checkout: (cwd: string, branch: string) => ipcRenderer.invoke('git:checkout', cwd, branch),
        show: (cwd: string, hash: string) => ipcRenderer.invoke('git:show', cwd, hash),
        createBranch: (cwd: string, name: string) => ipcRenderer.invoke('git:create-branch', cwd, name),
    },
    env: {
        check: (varName: string) => ipcRenderer.invoke('env:check', varName),
        get: (varName: string) => ipcRenderer.invoke('env:get', varName),
    },
    subprocess: {
        spawn: (id: string, command: string, args: string[], cwd?: string) =>
            ipcRenderer.invoke('subprocess:spawn', id, command, args, cwd),
        write: (id: string, data: string) => ipcRenderer.invoke('subprocess:write', id, data),
        kill: (id: string) => ipcRenderer.invoke('subprocess:kill', id),
        isAlive: (id: string) => ipcRenderer.invoke('subprocess:is-alive', id),
        // These use window.dispatchEvent because contextBridge proxying
        // can interfere with ipcRenderer.on callback delivery
        onStdout: (handler: (id: string, data: string) => void) => {
            window.addEventListener('subprocess-stdout', ((e: CustomEvent) => {
                handler(e.detail.id, e.detail.data)
            }) as EventListener)
        },
        onStderr: (handler: (id: string, data: string) => void) => {
            window.addEventListener('subprocess-stderr', ((e: CustomEvent) => {
                handler(e.detail.id, e.detail.data)
            }) as EventListener)
        },
        onError: (handler: (id: string, error: string) => void) => {
            window.addEventListener('subprocess-error', ((e: CustomEvent) => {
                handler(e.detail.id, e.detail.data)
            }) as EventListener)
        },
        onExit: (handler: (id: string, code: string) => void) => {
            window.addEventListener('subprocess-exit', ((e: CustomEvent) => {
                handler(e.detail.id, e.detail.data)
            }) as EventListener)
        },
    },
    dialog: {
        openDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY)
    },
    extensions: {
        scan: (workspacePath?: string) => ipcRenderer.invoke('extension:scan', workspacePath),
        readSource: (entryPoint: string) => ipcRenderer.invoke('extension:read-source', entryPoint)
    },
    app: {
        getPath: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PATH, name)
    },
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close')
    }
}

contextBridge.exposeInMainWorld('electron', api)
