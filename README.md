# Arpeggio

An agentic IDE for multi-agent orchestration, built as an Electron + React app. Arpeggio combines an Obsidian-like workspace with Discord-like chat channels, allowing users to spin up multiple AI agents and have them collaborate in shared channels or hand off work via artifacts.

Everything is built on an extension system — file renderers, agent adapters, sidebar panels, views, and commands are all extensions. Built-ins use the same API as user-written plugins.

## Philosophy

- **File Over App** — Everything is stored as files on disk. Chat logs, artifacts, workspace config. If Arpeggio disappears, your data survives.
- **Meet people where they are** — No opinion on which agent is best. Supports any agent through ACP, STDIO, HTTP, or custom adapters.
- **Extensions all the way down** — Every feature is a plugin. Built-in extensions can be overridden by user extensions.

## Features

### Workspaces
- Create workspaces pointing at project directories
- Switch between workspaces (Obsidian vault-style switcher)
- State persistence — open tabs and layout restored on restart

### File Editing
- **Markdown** — Full WYSIWYG editing with Milkdown/ProseMirror. GFM tables, task lists, inline formatting.
- **Code** — Monaco editor with syntax highlighting for 40+ languages. Bracket colorization, word wrap, configurable font/tab size.
- **PDF** — Canvas-based rendering with zoom controls and HiDPI support.
- **Images** — PNG, JPG, GIF, SVG, WebP viewer with zoom and checkered/dark/light backgrounds.
- **Plaintext** — Fallback viewer for everything else.

### Settings
Obsidian-style settings panel (`Ctrl+,`) with:
- **General** — Startup behavior, confirmations
- **Appearance** — Light / Dark / System theme with auto-detection
- **Core extensions** — Toggle built-in extensions on/off
- Per-extension settings for editor, markdown, images, PDF, file browser

### UI
- Single sidebar with panel switching (files, agents, channels)
- Resizable sidebar (drag to resize, 180–500px)
- Tab bar with sidebar toggle button
- `Ctrl+E` to show/hide sidebar
- Paper-themed design with warm tones

## Tech Stack

- **Electron** + **React** + **TypeScript**
- **electron-vite** for build toolchain
- **Milkdown** (ProseMirror) for markdown WYSIWYG
- **Monaco** for code editing
- **pdf.js** for PDF rendering
- **Vitest** for testing

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Extension System

Every feature in Arpeggio is an extension. Extensions receive an `ArpeggioAPI` instance and register capabilities:

```typescript
import type { ArpeggioAPI } from 'arpeggio'

export default function activate(app: ArpeggioAPI) {
    // Register a file renderer
    app.registerFileRenderer(['.csv'], CsvViewer)

    // Register a sidebar panel
    app.registerSidebarPanel('my-panel', {
        icon: MyIcon,
        label: 'My Panel',
        component: MyPanel,
        position: 'left',
    })

    // Register a settings tab
    app.registerSettingsTab('my-settings', {
        label: 'My Extension',
        component: MySettings,
        order: 50,
    })

    // Read/write settings
    const fontSize = app.getSetting<number>('fontSize') ?? 14
    app.setSetting('fontSize', fontSize)

    // Listen to events
    app.on('file:opened', ({ path }) => {
        console.log('File opened:', path)
    })
}
```

### Extension locations

| Location | Scope |
|----------|-------|
| `~/.arpeggio/extensions/*.ts` | Global |
| `~/.arpeggio/extensions/*/index.ts` | Global (directory) |
| `.arpeggio/extensions/*.ts` | Workspace-local |

### Registry types

| Method | Purpose |
|--------|---------|
| `registerFileRenderer` | Map file extensions → React components |
| `registerAgentAdapter` | Protocol handlers (ACP, STDIO, HTTP) |
| `registerAgentTemplate` | Zero-config agent setup |
| `registerSidebarPanel` | Sidebar panel components |
| `registerView` | Full-pane view types |
| `registerCommand` | Slash commands / command palette |
| `registerSettingsTab` | Settings panel tabs |

## Project Structure

```
src/
├── main/                         # Electron main process
│   ├── index.ts                  # App entry, window management
│   ├── ipc.ts                    # IPC handlers (fs, workspace, dialog)
│   └── extension-scanner.ts      # Discovers user extensions on disk
├── preload/
│   └── index.ts                  # Context bridge
├── renderer/                     # React app
│   ├── App.tsx                   # Root (init extensions, providers)
│   ├── components/               # App shell, sidebar, tabs, settings
│   ├── context/                  # Extension + Workspace React contexts
│   ├── core/                     # Extension API, registry, event bus, settings store
│   ├── extensions/               # Built-in extensions
│   │   ├── appearance/           # Light/dark/system theme
│   │   ├── code-editor/          # Monaco editor
│   │   ├── core-extensions/      # Extension toggle panel
│   │   ├── file-browser/         # File tree sidebar
│   │   ├── general-settings/     # General settings
│   │   ├── image-viewer/         # Image display
│   │   ├── markdown-renderer/    # Milkdown WYSIWYG
│   │   ├── pdf-viewer/           # pdf.js renderer
│   │   ├── agent-manager/        # Agent configuration
│   │   ├── chat-channels/        # Chat channel management
│   │   └── plaintext-renderer/   # Fallback text viewer
│   └── styles/                   # Global CSS
└── shared/
    └── types.ts                  # Cross-process types
```

## Roadmap

| Phase | Status |
|-------|--------|
| P1: Electron + Extension Core | ✅ Done |
| P2: Workspace & File Browser | ✅ Done |
| P6: Monaco & Markdown Rendering | ✅ Done |
| P3: Chat System & UI | Backlog |
| P4: Agent Framework | Backlog |
| P5: Multi-Agent & Adapters | Backlog |
| P7: Artifacts & Kanban | Backlog |
| P8: Git Integration | Backlog |
| P9: Plugin Ecosystem | Backlog |

## License

TBD
