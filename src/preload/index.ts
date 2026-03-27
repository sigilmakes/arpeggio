import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

export interface ElectronAPI {
    fs: {
        readDir: (path: string) => Promise<DirEntry[]>
        readFile: (path: string) => Promise<string>
        writeFile: (path: string, content: string) => Promise<boolean>
        stat: (path: string) => Promise<FileStat>
    }
    workspace: {
        list: () => Promise<string[]>
        getConfig: (name: string) => Promise<unknown>
    }
    extensions: {
        scan: (workspacePath?: string) => Promise<unknown[]>
        readSource: (entryPoint: string) => Promise<string>
    }
    app: {
        getPath: (name: string) => Promise<string>
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
        writeFile: (path: string, content: string) =>
            ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
        stat: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path)
    },
    workspace: {
        list: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST),
        getConfig: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CONFIG, name)
    },
    extensions: {
        scan: (workspacePath?: string) => ipcRenderer.invoke('extension:scan', workspacePath),
        readSource: (entryPoint: string) => ipcRenderer.invoke('extension:read-source', entryPoint)
    },
    app: {
        getPath: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PATH, name)
    }
}

contextBridge.exposeInMainWorld('electron', api)
