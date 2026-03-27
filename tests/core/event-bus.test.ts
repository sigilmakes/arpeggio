import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '@renderer/core/event-bus'

describe('EventBus', () => {
    let bus: EventBus

    beforeEach(() => {
        bus = new EventBus()
    })

    it('should fire handler on emit', async () => {
        const handler = vi.fn()
        bus.on('extension:loaded', handler)
        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(handler).toHaveBeenCalledWith({ extensionId: 'test' })
    })

    it('should support multiple handlers for the same event', async () => {
        const handler1 = vi.fn()
        const handler2 = vi.fn()
        bus.on('extension:loaded', handler1)
        bus.on('extension:loaded', handler2)
        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(handler1).toHaveBeenCalledOnce()
        expect(handler2).toHaveBeenCalledOnce()
    })

    it('should not fire handler after unsubscribe', async () => {
        const handler = vi.fn()
        const sub = bus.on('extension:loaded', handler)
        sub.unsubscribe()
        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(handler).not.toHaveBeenCalled()
    })

    it('should not fire handler after off()', async () => {
        const handler = vi.fn()
        bus.on('extension:loaded', handler)
        bus.off('extension:loaded', handler)
        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(handler).not.toHaveBeenCalled()
    })

    it('should handle async handlers', async () => {
        const order: number[] = []
        bus.on('extension:loaded', async () => {
            await new Promise((r) => setTimeout(r, 10))
            order.push(1)
        })
        bus.on('extension:loaded', async () => {
            order.push(2)
        })
        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(order).toContain(1)
        expect(order).toContain(2)
    })

    it('should catch errors in handlers without crashing', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const goodHandler = vi.fn()

        bus.on('extension:loaded', () => {
            throw new Error('Boom')
        })
        bus.on('extension:loaded', goodHandler)

        await bus.emit('extension:loaded', { extensionId: 'test' })
        expect(goodHandler).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('should report correct listener count', () => {
        expect(bus.listenerCount('extension:loaded')).toBe(0)
        const sub = bus.on('extension:loaded', () => {})
        expect(bus.listenerCount('extension:loaded')).toBe(1)
        sub.unsubscribe()
        expect(bus.listenerCount('extension:loaded')).toBe(0)
    })

    it('should clear all listeners', () => {
        bus.on('extension:loaded', () => {})
        bus.on('extension:error', () => {})
        bus.clear()
        expect(bus.listenerCount('extension:loaded')).toBe(0)
        expect(bus.listenerCount('extension:error')).toBe(0)
    })

    it('should not fail when emitting with no listeners', async () => {
        await expect(bus.emit('extension:loaded', { extensionId: 'test' })).resolves.toBeUndefined()
    })
})
