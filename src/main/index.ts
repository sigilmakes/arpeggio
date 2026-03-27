import { app, BrowserWindow, shell, Menu, ipcMain, protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { registerExtensionScanner } from './extension-scanner'
import { registerGitHandlers } from './git'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        show: false,
        title: 'Arpeggio',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            plugins: true,
            webviewTag: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })

    // Dev server or built files
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// Register custom protocol for serving local files (used by PDF viewer, images)
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'arpeggio-file',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true
        }
    }
])

app.whenReady().then(() => {
    // Remove the default menu bar
    Menu.setApplicationMenu(null)

    // Handle arpeggio-file:// protocol — serves local files
    protocol.handle('arpeggio-file', (request) => {
        // URL format: arpeggio-file:///absolute/path/to/file
        const filePath = decodeURIComponent(new URL(request.url).pathname)
        return net.fetch(pathToFileURL(filePath).toString())
    })

    registerIpcHandlers()
    registerExtensionScanner()
    registerGitHandlers()

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
