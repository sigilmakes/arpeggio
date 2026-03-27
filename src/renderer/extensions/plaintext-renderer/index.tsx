import type { ArpeggioAPI } from '../../core/extension-api'
import { PlaintextRenderer } from './PlaintextRenderer'

/**
 * Fallback plaintext renderer. Catches all file types not handled
 * by more specific renderers.
 */
export default function activate(app: ArpeggioAPI): void {
    // Register with a wildcard-ish pattern — low priority since it's registered last
    app.registerFileRenderer(['.*'], PlaintextRenderer)
}
