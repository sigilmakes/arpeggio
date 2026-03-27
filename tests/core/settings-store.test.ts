import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsStore } from '@renderer/core/settings-store'

// Mock localStorage
const storage = new Map<string, string>()
const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() { return storage.size },
    key: (_i: number) => null
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('SettingsStore', () => {
    let store: SettingsStore

    beforeEach(() => {
        storage.clear()
        store = new SettingsStore()
    })

    it('should return undefined for unset keys', () => {
        expect(store.get('ext', 'missing')).toBeUndefined()
    })

    it('should set and get values', () => {
        store.set('ext', 'theme', 'dark')
        expect(store.get<string>('ext', 'theme')).toBe('dark')
    })

    it('should persist to localStorage', () => {
        store.set('ext', 'theme', 'dark')
        const raw = storage.get('arpeggio:settings:ext')
        expect(raw).toBeDefined()
        expect(JSON.parse(raw!)).toEqual({ theme: 'dark' })
    })

    it('should load from localStorage on first access', () => {
        storage.set('arpeggio:settings:ext', JSON.stringify({ mode: 'system' }))
        const fresh = new SettingsStore()
        expect(fresh.get<string>('ext', 'mode')).toBe('system')
    })

    it('should isolate namespaces', () => {
        store.set('ext-a', 'key', 'a')
        store.set('ext-b', 'key', 'b')
        expect(store.get('ext-a', 'key')).toBe('a')
        expect(store.get('ext-b', 'key')).toBe('b')
    })

    it('should return all settings for a namespace', () => {
        store.set('ext', 'a', 1)
        store.set('ext', 'b', 2)
        expect(store.getAll('ext')).toEqual({ a: 1, b: 2 })
    })

    it('should notify listeners on change', () => {
        const listener = vi.fn()
        store.onChange('ext', listener)
        store.set('ext', 'theme', 'dark')
        expect(listener).toHaveBeenCalledWith('theme', 'dark')
    })

    it('should not notify after unsubscribe', () => {
        const listener = vi.fn()
        const unsub = store.onChange('ext', listener)
        unsub()
        store.set('ext', 'theme', 'dark')
        expect(listener).not.toHaveBeenCalled()
    })

    it('should not notify listeners for other namespaces', () => {
        const listener = vi.fn()
        store.onChange('ext-a', listener)
        store.set('ext-b', 'theme', 'dark')
        expect(listener).not.toHaveBeenCalled()
    })

    it('should clear settings for a namespace', () => {
        store.set('ext', 'theme', 'dark')
        store.clear('ext')
        expect(store.get('ext', 'theme')).toBeUndefined()
        expect(storage.has('arpeggio:settings:ext')).toBe(false)
    })

    it('should handle complex values', () => {
        store.set('ext', 'config', { nested: { deep: true }, list: [1, 2, 3] })
        const value = store.get<{ nested: { deep: boolean }; list: number[] }>('ext', 'config')
        expect(value?.nested.deep).toBe(true)
        expect(value?.list).toEqual([1, 2, 3])
    })
})
