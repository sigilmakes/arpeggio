import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { WorkspaceConfig, WorkspaceState, OpenTab } from '@shared/types'

interface WorkspaceContextValue {
    // Workspace list
    workspaces: WorkspaceConfig[]
    refreshWorkspaces: () => Promise<void>

    // Active workspace
    activeWorkspace: WorkspaceConfig | null
    openWorkspace: (id: string) => Promise<void>
    closeWorkspace: () => void
    createWorkspace: (name: string, projectPaths: string[]) => Promise<WorkspaceConfig>
    deleteWorkspace: (id: string) => Promise<void>
    reloadWorkspace: () => Promise<void>

    // Tabs
    openTabs: OpenTab[]
    activeTabId: string | null
    openFile: (path: string) => void
    closeTab: (id: string) => void
    setActiveTab: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function tabIdFromPath(path: string): string {
    return path
}

function tabLabelFromPath(path: string): string {
    if (path.startsWith('chat://')) {
        return '#' + path.slice(7)
    }
    if (path.startsWith('diff://')) {
        return '± ' + path.slice(7, 14) // short hash
    }
    return path.split('/').pop() ?? path
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([])
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceConfig | null>(null)
    const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
    const [activeTabId, setActiveTabId] = useState<string | null>(null)

    // Load workspace list on mount
    const refreshWorkspaces = useCallback(async () => {
        try {
            const list = (await window.electron.workspace.list()) as WorkspaceConfig[]
            setWorkspaces(list)
        } catch (error) {
            console.error('[Workspace] Failed to list workspaces:', error)
        }
    }, [])

    useEffect(() => {
        refreshWorkspaces()
    }, [refreshWorkspaces])

    // Restore last active workspace
    useEffect(() => {
        const lastId = localStorage.getItem('arpeggio:last-workspace')
        if (lastId && workspaces.length > 0) {
            const ws = workspaces.find((w) => w.id === lastId)
            if (ws) {
                openWorkspaceImpl(ws)
            }
        }
    }, [workspaces]) // eslint-disable-line react-hooks/exhaustive-deps

    async function openWorkspaceImpl(ws: WorkspaceConfig): Promise<void> {
        setActiveWorkspace(ws)
        localStorage.setItem('arpeggio:last-workspace', ws.id)

        // Load saved state
        try {
            const state = (await window.electron.workspace.loadState(ws.id)) as WorkspaceState | null
            if (state) {
                setOpenTabs(state.openTabs ?? [])
                setActiveTabId(state.activeTabId ?? null)
            } else {
                setOpenTabs([])
                setActiveTabId(null)
            }
        } catch {
            setOpenTabs([])
            setActiveTabId(null)
        }
    }

    const openWorkspace = useCallback(
        async (id: string) => {
            const ws = workspaces.find((w) => w.id === id)
            if (ws) await openWorkspaceImpl(ws)
        },
        [workspaces] // eslint-disable-line react-hooks/exhaustive-deps
    )

    const reloadWorkspace = useCallback(async () => {
        if (!activeWorkspace) return
        try {
            const config = (await window.electron.workspace.getConfig(activeWorkspace.id)) as WorkspaceConfig
            setActiveWorkspace(config)
        } catch (error) {
            console.error('[Workspace] Failed to reload:', error)
        }
    }, [activeWorkspace])

    const closeWorkspace = useCallback(() => {
        if (activeWorkspace) {
            saveState(activeWorkspace.id, openTabs, activeTabId)
        }
        setActiveWorkspace(null)
        setOpenTabs([])
        setActiveTabId(null)
        localStorage.removeItem('arpeggio:last-workspace')
    }, [activeWorkspace, openTabs, activeTabId])

    const createWorkspace = useCallback(
        async (name: string, projectPaths: string[]): Promise<WorkspaceConfig> => {
            const id = slugify(name) || `ws-${Date.now()}`
            const config = (await window.electron.workspace.create({
                id,
                name,
                projectPaths
            })) as WorkspaceConfig
            await refreshWorkspaces()
            return config
        },
        [refreshWorkspaces]
    )

    const deleteWorkspace = useCallback(
        async (id: string) => {
            await window.electron.workspace.delete(id)
            if (activeWorkspace?.id === id) {
                setActiveWorkspace(null)
                setOpenTabs([])
                setActiveTabId(null)
            }
            await refreshWorkspaces()
        },
        [activeWorkspace, refreshWorkspaces]
    )

    // Tab management
    const openFile = useCallback(
        (path: string) => {
            const id = tabIdFromPath(path)
            const existing = openTabs.find((t) => t.id === id)
            if (existing) {
                setActiveTabId(id)
            } else {
                const newTab: OpenTab = { id, path, label: tabLabelFromPath(path) }
                setOpenTabs((prev) => [...prev, newTab])
                setActiveTabId(id)
            }
        },
        [openTabs]
    )

    const closeTab = useCallback(
        (id: string) => {
            setOpenTabs((prev) => {
                const next = prev.filter((t) => t.id !== id)
                // If closing the active tab, switch to adjacent
                if (activeTabId === id) {
                    const idx = prev.findIndex((t) => t.id === id)
                    const nextActive = next[Math.min(idx, next.length - 1)]
                    setActiveTabId(nextActive?.id ?? null)
                }
                return next
            })
        },
        [activeTabId]
    )

    // Auto-save state when tabs change
    useEffect(() => {
        if (!activeWorkspace) return
        const timer = setTimeout(() => {
            saveState(activeWorkspace.id, openTabs, activeTabId)
        }, 500)
        return () => clearTimeout(timer)
    }, [activeWorkspace, openTabs, activeTabId])

    return (
        <WorkspaceContext.Provider
            value={{
                workspaces,
                refreshWorkspaces,
                activeWorkspace,
                openWorkspace,
                closeWorkspace,
                createWorkspace,
                deleteWorkspace,
                reloadWorkspace,
                openTabs,
                activeTabId,
                openFile,
                closeTab,
                setActiveTab: setActiveTabId
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    )
}

function saveState(wsId: string, tabs: OpenTab[], activeTab: string | null): void {
    const state: Partial<WorkspaceState> = {
        openTabs: tabs,
        activeTabId: activeTab
    }
    window.electron.workspace.saveState(wsId, state as Record<string, unknown>).catch((err) => {
        console.error('[Workspace] Failed to save state:', err)
    })
}

export function useWorkspace(): WorkspaceContextValue {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider')
    return ctx
}
