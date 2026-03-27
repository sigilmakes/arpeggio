import { ExtensionLoader } from './core/extension-loader'

// Built-in extension activate functions
import fileBrowserActivate from './extensions/file-browser'
import agentManagerActivate from './extensions/agent-manager'
import chatChannelsActivate from './extensions/chat-channels'

/**
 * Register all built-in extensions.
 * These use the exact same API as user extensions.
 */
export function initExtensions(loader: ExtensionLoader): void {
    loader.registerBuiltIn(
        'arpeggio.file-browser',
        'File Browser',
        fileBrowserActivate
    )

    loader.registerBuiltIn(
        'arpeggio.agent-manager',
        'Agent Manager',
        agentManagerActivate
    )

    loader.registerBuiltIn(
        'arpeggio.chat-channels',
        'Chat Channels',
        chatChannelsActivate
    )
}
