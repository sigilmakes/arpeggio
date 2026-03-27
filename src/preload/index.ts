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
