import type { ArpeggioAPI } from '../../core/extension-api'
import { ChatChannelsPanel, ChatChannelsIcon } from './ChatChannelsPanel'

export default function activate(app: ArpeggioAPI): void {
    app.registerSidebarPanel('chat-channels', {
        icon: ChatChannelsIcon,
        label: 'Channels',
        component: ChatChannelsPanel,
        position: 'left',
        order: 20
    })
}
