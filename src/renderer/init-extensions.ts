import { ExtensionLoader } from './core/extension-loader'

// Built-in extension activate functions
import appearanceActivate from './extensions/appearance'
import fileBrowserActivate from './extensions/file-browser'
import agentManagerActivate from './extensions/agent-manager'
import chatChannelsActivate from './extensions/chat-channels'
import markdownRendererActivate from './extensions/markdown-renderer'
import codeEditorActivate from './extensions/code-editor'
import imageViewerActivate from './extensions/image-viewer'
import pdfViewerActivate from './extensions/pdf-viewer'
import plaintextRendererActivate from './extensions/plaintext-renderer'

/**
 * Register all built-in extensions.
 * These use the exact same API as user extensions.
 *
 * Order matters for file renderers — first match wins.
 * Specific renderers go first, plaintext fallback goes last.
 */
export function initExtensions(loader: ExtensionLoader): void {
    // Core settings
    loader.registerBuiltIn('arpeggio.appearance', 'Appearance', appearanceActivate)

    // Sidebar panels
    loader.registerBuiltIn('arpeggio.file-browser', 'File Browser', fileBrowserActivate)
    loader.registerBuiltIn('arpeggio.agent-manager', 'Agent Manager', agentManagerActivate)
    loader.registerBuiltIn('arpeggio.chat-channels', 'Chat Channels', chatChannelsActivate)

    // File renderers — specific types first
    loader.registerBuiltIn('arpeggio.markdown-renderer', 'Markdown', markdownRendererActivate)
    loader.registerBuiltIn('arpeggio.code-editor', 'Code Editor', codeEditorActivate)
    loader.registerBuiltIn('arpeggio.image-viewer', 'Image Viewer', imageViewerActivate)
    loader.registerBuiltIn('arpeggio.pdf-viewer', 'PDF Viewer', pdfViewerActivate)

    // Plaintext fallback — loaded last, lowest priority
    loader.registerBuiltIn('arpeggio.plaintext-renderer', 'Plaintext', plaintextRendererActivate)
}
