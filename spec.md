# Arpeggio

## BLUF

Arpeggio is an agentic IDE for working on projects, with a focus on good first-class support for multi-agent orchestration. It includes a beautiful design meant to look like textured paper, with clean sans-serif fonts and simple yet elegant UI. It is heavily inspired by common Obsidian workflows used by developers for managing and controlling context graphs, alongside Discord for excellent UI/UX of thread-based communication in both DMs and group chats.

## Philosophy

Arpeggio is a fairly minimal IDE, designed heavily around plugins and extensions. It has a heavily extensible nature based on its plugin API, which allows users to write plugins to customise the UI, file rendering, add new features, etc. The plugin system should be as powerful as Obsidian and pi's plugin system.

Arpeggio is designed to be an incredibly open system, and as such *it meets people where they are.* Arpeggio has no opinion on what agent the user likes best, it instead supports all agents through ACP, STDIO, HTTP, and any other protocol. If it can be prompted, it can be supported. Support for more agent endpoints is as easy as writing a new plugin.

The ultimate core philosophy of Arpeggio is **File Over App.** Everything is stored as files on disk — chat logs, artifacts, workspace config. If Arpeggio disappears, your data survives.

## Tech Stack

Arpeggio is an Electron React app, and is cross-platform. It has first class support for communicating through ACP for agents like Claude Code, OpenClaw, etc. It also can communicate to other agents through STDIO, HTTP, etc. Each system in Arpeggio is written using Arpeggio's extension system. *Everything* is an extension, to make it maximally extensible.

---

## Workspaces

Obsidian has vaults, Discord has servers. Arpeggio has **workspaces**. Each workspace includes:

### 1. Project File Browser & Editors

An interface for seeing the actual workspace of a project. Arpeggio **references** existing project directories — it does not own or move them. The workspace config points at one or more project paths, and the file browser navigates those trees directly. All reads and writes happen in place at the original file location.

File rendering is extension-based dispatch. Each extension registers the file types it handles:

| Extension | Renderer |
|-----------|----------|
| `.md` | Markdown renderer (built-in, Obsidian-style) |
| `.js`, `.py`, `.ts`, etc. | Monaco editor (embedded code editor) |
| `.docx` | DOCX renderer (extension) |
| `.pdf` | PDF viewer (extension) |
| `.csv` | Spreadsheet viewer (extension) |

Monaco (the editor component that powers VSCode) provides syntax highlighting, autocomplete, and multi-cursor editing. It is not a full VSCode — heavy coding happens through the agents. If nothing matches a file type, Arpeggio falls back to plaintext.

### 2. Chat System

The user can freely add or remove channels (akin to Discord channels) at will, and dynamically add and remove agents to these channels. Each Arpeggio workspace has a set of configured agents, and the user can add or remove agents at will.

### 3. Artifact Workspace

An orchestration/context artifact workspace. By default each workspace has an empty kanban board, which is a markdown file rendered as kanban (similar to Obsidian's kanban extension). This space is for persistent artifacts, plans, notes — anything the user or agents produce that should live beyond a single chat.

---

## Workspace Storage

Arpeggio separates its own data from the user's project files. The workspace config holds pointers to project directories; Arpeggio never moves or copies project files.

```
~/.arpeggio/                          # Or wherever the user configures
  workspaces/
    my-project/
      workspace.json                  # Workspace config (see below)
      chat/
        general.jsonl                 # Channel chat logs (JSONL)
        design.jsonl
      artifacts/
        board.kanban.md               # Kanban board
        notes/                        # User/agent artifacts
```

### workspace.json

```json
{
  "name": "My Project",
  "projectPaths": ["/home/user/code/my-project"],
  "agents": [
    {
      "id": "hades-1",
      "name": "Hades",
      "template": "claude-code",
      "config": {}
    }
  ],
  "channels": [
    {
      "id": "general",
      "name": "General",
      "agents": ["hades-1"]
    }
  ]
}
```

`projectPaths` is an array from day one. The UI may only support a single project path initially, but the data model supports multi-root workspaces (like VSCode) without migration.

### Chat Log Format

Chat logs are stored as **JSONL** (one JSON object per line). JSONL is structured, appendable, produces reasonable git diffs, and is trivial to parse. The UI renders them nicely; an export-to-Markdown command handles human-readable output.

Each workspace functions as a git repo, and Arpeggio has a built-in git management system akin to Obsidian's git plugin.

---

## Agents

### Agent Model

An agent in Arpeggio is a **connection config**, not a process. Arpeggio owns the pipe to talk to the agent, not the agent's runtime. Each adapter type (ACP, STDIO, HTTP) is an extension that knows how to manage that specific connection type.

```json
{
  "id": "hades-1",
  "name": "Hades",
  "template": "claude-code",
  "adapter": "acp",
  "endpoint": "...",
  "status": "active"
}
```

What "spin up" and "spin down" mean depends on the adapter:

| Adapter | Spin Up | Spin Down |
|---------|---------|-----------|
| **STDIO** (Claude Code, Aider, Codex) | Spawn subprocess | Kill subprocess |
| **HTTP** (API-based agents) | Connect / start session | Disconnect |
| **ACP** | Open ACP session | Close ACP session |

The workspace sees a unified status regardless of adapter: **available / active / inactive**.

### Agent Templates

Common agents ship as **built-in plugins** with zero configuration. The user hits `[+ New Agent]`, picks a template, names it, done.

Built-in templates:
- **Claude Code** — ACP adapter, auto-detected
- **Codex** — STDIO adapter, auto-detected from `$PATH`
- **Aider** — STDIO adapter, auto-detected from `$PATH`
- **OpenClaw** — ACP adapter, auto-detected

Each template knows how to find the tool on the system (check `$PATH`, common install locations) and handles the connection. API keys come from environment variables or a one-time prompt stored in Arpeggio's credential store.

Third-party or niche agents use the community plugin route — write a small adapter extension, publish it, anyone can install it.

### Agents in Channels

- A **workspace** has a roster of configured agents
- A **channel** has a subset of those agents actively participating
- The user adds an agent to a channel (drag-and-drop or `/add agent-name`), and it starts receiving messages
- Removing an agent from a channel stops it from receiving messages

When an agent joins a channel, it starts with **no context** by default. The user (or another agent) provides context explicitly — through messages, files, or artifacts. This fits the File Over App philosophy: if context matters, it should be in a file or artifact the agent can reference, not hidden in chat history.

### Agent-to-Agent Communication

Two models, both supported:

- **Shared channel** — agents talk in the same channel, see each other's messages. The user moderates. This is the default and handles most collaboration.
- **Artifact handoff** — an agent produces an artifact (file, document, plan), and another agent is directed to pick it up. More structured, for longer workflows.

The channel is the conversation. The artifact workspace is the persistent output.

---

## Extension Architecture

### Core Principles

- **Full trust, renderer process** — extensions get the DOM, React, Node.js, and the full Arpeggio API. No sandbox, no IPC boundary. Same model as Obsidian and pi.
- **Single entry point** — each extension exports a default `activate` function that receives the `ArpeggioAPI`.
- **Registry-based** — extensions register capabilities (renderers, adapters, panels, views, commands) into typed registries.
- **Event-driven** — `app.on('event', handler)` for lifecycle hooks.
- **Built-ins use the same API** — there is no privileged internal path. If a built-in can do it, a plugin can do it. Built-in extensions can be overridden.
- **TypeScript without compilation** — extensions are loaded via jiti, so TypeScript works directly.

### Extension Locations

| Location | Scope |
|----------|-------|
| `~/.arpeggio/extensions/*.ts` | Global (all workspaces) |
| `~/.arpeggio/extensions/*/index.ts` | Global (subdirectory) |
| `.arpeggio/extensions/*.ts` | Workspace-local |
| `.arpeggio/extensions/*/index.ts` | Workspace-local (subdirectory) |

### API Shape

```typescript
import type { ArpeggioAPI } from "arpeggio";

export default function activate(app: ArpeggioAPI) {
  // File renderer — provides a React component for given file types
  app.registerFileRenderer(['.md', '.markdown'], MarkdownRenderer);

  // Agent adapter — handles a connection protocol
  app.registerAgentAdapter('stdio', STDIOAdapter);

  // Agent template — zero-config agent setup
  app.registerAgentTemplate('claude-code', {
    displayName: 'Claude Code',
    adapter: 'acp',
    detect: () => { /* check if available */ },
    defaults: { /* default config */ },
  });

  // Sidebar panel — adds a panel to the right sidebar
  app.registerSidebarPanel('git', {
    icon: GitIcon,
    component: GitPanel,
    position: 'right',
  });

  // Workspace view — a full-pane view type
  app.registerView('kanban', {
    displayName: 'Kanban Board',
    component: KanbanView,
    filePatterns: ['*.kanban.md'],
  });

  // Command — slash commands in chat or command palette
  app.registerCommand('summarize', {
    description: 'Summarize the conversation',
    handler: summarizeHandler,
  });

  // Events
  app.on('message_received', async (event) => { /* ... */ });
  app.on('agent_connected', async (event) => { /* ... */ });
  app.on('channel_created', async (event) => { /* ... */ });
  app.on('file_opened', async (event) => { /* ... */ });
}
```

### Registry Types

| Registry | Purpose | Example Built-ins |
|----------|---------|-------------------|
| `registerFileRenderer` | Map file extensions to React renderer components | Markdown, Monaco |
| `registerAgentAdapter` | Protocol handlers for agent communication | ACP, STDIO, HTTP |
| `registerAgentTemplate` | Zero-config agent setup templates | Claude Code, Codex, Aider, OpenClaw |
| `registerSidebarPanel` | Panels in the left or right sidebar | File browser, agent manager, git |
| `registerView` | Full-pane view types | Kanban, artifact viewer |
| `registerCommand` | Slash commands and command palette actions | `/summarize`, `/add` |

### Safety Model

Full trust is safe here because:

1. **File Over App** — all data is files on disk. A crash never causes data loss.
2. **Community review** — when the ecosystem matures, extensions go through review before being listed in a community directory. Users can install unreviewed extensions with a warning.
3. **Proven model** — Obsidian and pi both use full-trust extensions successfully at scale.

---

## UI

Arpeggio's UI should be immediately familiar to anyone using Obsidian.

- **Left sidebar (narrow)** — workspace switcher, similar to the Discord server sidebar
- **Left sidebar (wide)** — file browser for the active workspace's project files
- **Center pane** — the active view: a file editor, chat channel, or artifact
- **Right sidebar** — contextual panels: markdown backlinks, git management, graph view, agent manager (spin up/down agents, add/remove from channels)

The UI is simple yet powerful, clean and beautiful. It defaults to a sans-serif font with paper-themed UI.

### Agent Manager (Right Sidebar)

```
Agents
──────────────────
🟢 Hades (Claude Code)
🟢 Sketch (Codex)
⚫ Review-bot (OpenClaw)

[+ New Agent]  ← opens template picker
```

---

## Build Phases

### Phase 1 — MVP

- Create workspaces, point at project directories
- Create/delete chat channels within a workspace
- One built-in agent adapter (Claude Code via ACP) — spin up, add to channel, chat
- Basic file browser — see project files in the sidebar, open read-only
- JSONL chat persistence
- Extension architecture in place internally (built-ins use the extension API)

### Phase 2 — Multi-Agent & More Adapters

- Multiple agents in a channel, seeing each other's messages
- STDIO and HTTP adapters
- Built-in templates for Codex, Aider, OpenClaw
- Agent template picker UI

### Phase 3 — Workspace Richness

- Monaco editor for code files
- Markdown renderer (Obsidian-style)
- File browser goes read-write
- Basic extension API exposed to users

### Phase 4 — Artifacts & Orchestration

- Artifact workspace
- Kanban board (markdown-backed)
- Agent-to-agent handoffs via artifacts
- Git integration

### Phase 5 — Plugin Ecosystem

- Full plugin API (register renderers, adapters, sidebar panels, etc.)
- Community plugin install/management
- DOCX, PDF, spreadsheet renderers as plugins
- Graph view

---

## Similar Projects

- **Obsidian** — Personal knowledge management system
- **Discord** — Multi-user chat system
- **Paperclip** — Agent orchestration system for running companies
