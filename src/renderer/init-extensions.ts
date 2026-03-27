import { ExtensionLoader } from './core/extension-loader'

// Built-in extension activate functions
import generalSettingsActivate from './extensions/general-settings'
import appearanceActivate from './extensions/appearance'
import coreExtensionsActivate from './extensions/core-extensions'
import fileBrowserActivate from './extensions/file-browser'
import agentManagerActivate from './extensions/agent-manager'
import chatChannelsActivate from './extensions/chat-channels'
import gitPanelActivate from './extensions/git-panel'
import markdownRendererActivate from './extensions/markdown-renderer'
import codeEditorActivate from './extensions/code-editor'
import imageViewerActivate from './extensions/image-viewer'
import pdfViewerActivate from './extensions/pdf-viewer'
import plaintextRendererActivate from './extensions/plaintext-renderer'
import echoAdapterActivate from './extensions/adapters/echo'
import stdioAdapterActivate from './extensions/adapters/stdio'

/**
 * Register all built-in extensions.
 * Order matters for file renderers — first match wins.
 */
export function initExtensions(loader: ExtensionLoader): void {
    // Core settings (show in "Options" section)
    loader.registerBuiltIn('arpeggio.general-settings', 'General', generalSettingsActivate)
    loader.registerBuiltIn('arpeggio.appearance', 'Appearance', appearanceActivate)
    loader.registerBuiltIn('arpeggio.core-extensions', 'Core Extensions', coreExtensionsActivate)

    // Sidebar panels
    loader.registerBuiltIn('arpeggio.file-browser', 'File Browser', fileBrowserActivate)
    loader.registerBuiltIn('arpeggio.agent-manager', 'Agent Manager', agentManagerActivate)
    loader.registerBuiltIn('arpeggio.chat-channels', 'Chat Channels', chatChannelsActivate)
    loader.registerBuiltIn('arpeggio.git-panel', 'Git', gitPanelActivate)

    // File renderers — specific types first
    loader.registerBuiltIn('arpeggio.markdown-renderer', 'Markdown', markdownRendererActivate)
    loader.registerBuiltIn('arpeggio.code-editor', 'Code Editor', codeEditorActivate)
    loader.registerBuiltIn('arpeggio.image-viewer', 'Image Viewer', imageViewerActivate)
    loader.registerBuiltIn('arpeggio.pdf-viewer', 'PDF Viewer', pdfViewerActivate)

    // Plaintext fallback — loaded last
    loader.registerBuiltIn('arpeggio.plaintext-renderer', 'Plaintext', plaintextRendererActivate)

    // Agent adapters
    loader.registerBuiltIn('arpeggio.adapter-echo', 'Echo Adapter', echoAdapterActivate)
    loader.registerBuiltIn('arpeggio.adapter-stdio', 'STDIO Adapter', stdioAdapterActivate)
}
