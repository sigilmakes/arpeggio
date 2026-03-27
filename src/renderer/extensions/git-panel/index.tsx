import type { ArpeggioAPI } from '../../core/extension-api'
import { GitPanel, GitIcon } from './GitPanel'

export default function activate(app: ArpeggioAPI): void {
    app.registerSidebarPanel('git', {
        icon: GitIcon,
        label: 'Git',
        component: GitPanel,
        position: 'left',
        order: 30
    })
}
