import type { ArpeggioEvents, ArpeggioEventName } from '@shared/types'

type EventHandler<E extends ArpeggioEventName> = (payload: ArpeggioEvents[E]) => void | Promise<void>

interface EventSubscription {
    unsubscribe: () => void
}

/**
 * Typed event bus for Arpeggio.
 * Extensions subscribe to events via `app.on('event', handler)`.
 */
export class EventBus {
    private listeners = new Map<ArpeggioEventName, Set<EventHandler<ArpeggioEventName>>>()

    on<E extends ArpeggioEventName>(event: E, handler: EventHandler<E>): EventSubscription {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        const handlers = this.listeners.get(event)!
        handlers.add(handler as EventHandler<ArpeggioEventName>)

        return {
            unsubscribe: () => {
                handlers.delete(handler as EventHandler<ArpeggioEventName>)
                if (handlers.size === 0) {
                    this.listeners.delete(event)
                }
            }
        }
    }

    off<E extends ArpeggioEventName>(event: E, handler: EventHandler<E>): void {
        const handlers = this.listeners.get(event)
        if (handlers) {
            handlers.delete(handler as EventHandler<ArpeggioEventName>)
            if (handlers.size === 0) {
                this.listeners.delete(event)
            }
        }
    }

    async emit<E extends ArpeggioEventName>(event: E, payload: ArpeggioEvents[E]): Promise<void> {
        const handlers = this.listeners.get(event)
        if (!handlers) return

        const promises: Promise<void>[] = []
        for (const handler of handlers) {
            try {
                const result = handler(payload)
                if (result instanceof Promise) {
                    promises.push(result)
                }
            } catch (error) {
                console.error(`[EventBus] Error in handler for ${event}:`, error)
            }
        }

        if (promises.length > 0) {
            await Promise.allSettled(promises)
        }
    }

    listenerCount(event: ArpeggioEventName): number {
        return this.listeners.get(event)?.size ?? 0
    }

    clear(): void {
        this.listeners.clear()
    }
}
