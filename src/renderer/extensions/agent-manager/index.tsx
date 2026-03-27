import type { ArpeggioAPI } from '../../core/extension-api'
import { AgentManagerPanel, AgentManagerIcon } from './AgentManagerPanel'

export default function activate(app: ArpeggioAPI): void {
    app.registerSidebarPanel('agent-manager', {
        icon: AgentManagerIcon,
        label: 'Agents',
        component: AgentManagerPanel,
        position: 'left',
        order: 10
    })

    app.registerCommand('agents', {
        description: 'Open the agent manager',
        handler: () => {
            console.log('[agent-manager] Open agent manager command')
        }
    })
}
