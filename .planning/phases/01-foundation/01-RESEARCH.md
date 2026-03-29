# Phase 1: Foundation - Research

**Phase:** 01-foundation
**Researched:** 2026-03-28
**Confidence:** HIGH

## What I Need to Know to Plan This Phase

### 1. OpenClaw SDK Integration Model

The OpenClaw package (`openclaw`) is primarily a **gateway/runtime CLI tool**, not a traditional npm library. It exposes a plugin SDK surface through `openclaw/plugin-sdk/*` subpath exports. Key insight: ClawHive should integrate as a **library consumer**, importing plugin-sdk modules to leverage existing provider patterns, session management, and config loading — rather than wrapping the CLI.

**Critical finding:** The SDK's plugin architecture expects providers to register via `definePluginEntry` and `api.registerProvider()`. For ClawHive:
- Import `openclaw/plugin-sdk` for types and helpers
- Import existing provider implementations (Anthropic, OpenAI) directly from `extensions/` source
- For Ollama: use a custom provider plugin pattern following the existing provider template
- Session management patterns from `src/sessions/` (UUID-based sessions, lifecycle events, transcript events)

### 2. Electron + OpenClaw Integration Architecture

Since OpenClaw is primarily CLI-based with a gateway architecture, the integration requires:

**Option A (recommended):** Spawn OpenClaw gateway as a child process, communicate via IPC/WebSocket
**Option B:** Import plugin-sdk modules directly into Electron main process

Option A is cleaner because:
- OpenClaw's gateway handles all provider authentication, model routing, session management natively
- Electron main process stays as a thin orchestration layer
- Gateway runs at `localhost:PORT` (configurable), Electron connects as a client
- Gateway exposes WebSocket for real-time streaming responses

**Trade-off:** Option A adds process overhead (~50MB RAM) but avoids native module compatibility issues (better-sqlite3, etc.) between OpenClaw's Node 22 and Electron's bundled Node version.

### 3. Electron Security Configuration

Non-negotiable settings for `BrowserWindow`:
```javascript
webPreferences: {
  contextIsolation: true,      // Required — separate JS contexts
  nodeIntegration: false,     // Required — no Node in renderer
  sandbox: true,             // Renderer sandbox
  webSecurity: true,         // Enable web security
}
```

For Phase 1, a single renderer process is fine. Multi-agent isolation (utility processes per agent) is a Phase 2+ concern.

**CSP header:** Must be set to prevent XSS. Minimal policy:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
```

### 4. IPC Bridge Design

Secure IPC between renderer and main process via `contextBridge`:

**Exposed API surface (preload):**
```typescript
// ClawHive API exposed to renderer
clawhive: {
  // Gateway connection
  connect(gatewayUrl: string): Promise<void>
  disconnect(): void
  onGatewayEvent(cb: (event: GatewayEvent) => void): () => void

  // Chat
  sendMessage(sessionId: string, content: string, options?: SendOptions): Promise<void>
  onMessage(cb: (msg: Message) => void): () => void

  // Session
  createSession(agentId: string, modelConfig: ModelConfig): Promise<Session>
  getSessions(): Promise<Session[]>
  deleteSession(sessionId: string): Promise<void>

  // Storage
  getStoragePath(): Promise<string>
  setStoragePath(path: string): Promise<void>

  // Config
  getConfig(): Promise<AppConfig>
  setConfig(config: Partial<AppConfig>): Promise<void>

  // File operations
  uploadFile(file: File): Promise<UploadResult>
  selectDirectory(): Promise<string | null>

  // System
  getTheme(): Promise<'dark' | 'light' | 'system'>
  onThemeChange(cb: (theme: string) => void): () => void
}
```

All IPC uses `ipcRenderer.invoke()` (async, request/response) for security. No `sendSync`.

### 5. Model Provider Pattern

Three providers needed for Phase 1:
1. **Anthropic** — `extensions/anthropic/` source, use as-is
2. **OpenAI** — `extensions/openai/` source, use as-is
3. **Ollama** — Custom provider plugin, follows same `ProviderPlugin` interface

Provider selection UX: dropdown in top bar, remembers last used on restart. Model list fetched dynamically from provider API (Anthropic/OpenAI) or Ollama's `/api/tags` endpoint.

**API key storage:** `electron-store` with encryption enabled. Keys stored per-provider in user's config directory.

### 6. SQLite + Encryption

For encrypted local storage, two options:
- **sql.js** (pure JS, WASM): No native compilation, works in Electron renderer, slower, encrypted via sql.js built-in
- **better-sqlite3 + sqlcipher**: Native, faster, requires Electron rebuilds, true SQLCipher encryption

**Recommendation for Phase 1:** sql.js with AES-256 encryption layer (encrypt entire DB file, not per-row). Simpler build pipeline, no native module rebuilds needed when Electron version changes.

**Schema approach:** Single SQLite file per agent session at `~/.clawhive/agents/<id>/sessions.db` (following OpenClaw's `~/.openclaw/agents/<agentId>/` pattern).

### 7. Chat UI Architecture

React 18 with streaming response support:
- Use `ReadableStream` from fetch API for streaming
- Display tokens as they arrive (no buffering)
- Markdown rendering with `react-markdown` + `remark-gfm`
- Code blocks with syntax highlighting (`highlight.js` or `shiki`)
- File/image attachments: render inline thumbnails

**Ambient glow effect:** CSS animation on input container during agent work. Subtle `box-shadow` pulse, ~2s cycle, `--glow-color` derived from theme. No progress bar.

**Layout:** Fixed sticky input at bottom, scrollable message history above. Left panel for agent/team list (Phase 1: single agent only, but layout should accommodate it).

### 8. Dark/Light Mode

CSS custom properties approach:
```css
:root { --bg-primary: #...; --text-primary: #...; }
[data-theme="dark"] { --bg-primary: #...; }
[data-theme="light"] { --bg-primary: #...; }
```

- Read system preference on startup via `prefers-color-scheme`
- Listen to `nativeTheme.themeSource` changes
- Persist user override in `electron-store`
- Apply `data-theme` attribute to `<html>` element

### 9. Project Structure

pnpm workspace monorepo:
```
clawhive/
├── package.json          # pnpm workspace root
├── pnpm-workspace.yaml   # packages: ['apps/*', 'packages/*']
├── apps/
│   └── desktop/         # Electron app
│       ├── src/
│       │   ├── main/     # Electron main process
│       │   ├── preload/  # Preload scripts
│       │   └── renderer/  # React app
│       ├── electron-builder.yml
│       └── package.json
├── packages/
│   ├── ui/               # Shared React components (optional)
│   └── sdk/             # ClawHive SDK wrapper (optional)
└── tsconfig.base.json
```

Or single `apps/desktop/` package for Phase 1 simplicity. Graduate to packages/ when shared code emerges.

### 10. DMG Distribution

`electron-builder` with:
- `target: DMG`
- `category: public.app-category.productivity`
- Custom install location (user selects where to install)
- Code signing: ad-hoc for development, full signing + notarization for distribution
- Minimum macOS: 13.0

### Validation Architecture

**Dimension 8 (Validation) Strategy:**

| Requirement | Verification Method |
|-------------|-------------------|
| FND-01 DMG install | `electron-builder --dir` produces valid .app, can be moved |
| FND-02 Secure shell | `contextIsolation: true` verified via grep in main.ts |
| FND-03 Custom data path | Native dialog opens, path persisted to electron-store |
| FND-04 Chat interface | Functional test: send message, receive streamed response |
| FND-05 Model providers | Switch provider, verify correct API called |
| FND-06 File upload | Drag file, verify it appears in message |
| FND-07 SQLite persistence | Close app, reopen, verify chat history exists |
| FND-08 Dark/light mode | Toggle, verify CSS variables applied |
| FND-09 Ambient glow | Send message, verify CSS animation active during response |
| FND-10 IPC bridge | All preload API methods callable from renderer |

## Validation Architecture

Phase 1 has no complex multi-component interactions requiring formal verification. The Validation Architecture is straightforward: each requirement maps to a single atomic test (functional, grep, or manual verification). No cross-component state machines or concurrency concerns at this stage.

---

## Paperclip: Canonical Reference & Design Inspiration

**Source:** `/Volumes/S/Projects/paperclip/` (Paperclip GitHub repo, fully cloned)
**Confidence:** HIGH — primary production reference

### What Paperclip Is

Paperclip is **"the company" to OpenClaw's "employee"**. It's a Node.js server + React UI that orchestrates AI agent teams to run a business. The key quote from their README:

> "If OpenClaw is an _employee_, Paperclip is the _company_"
> "Manage business goals, not pull requests."

Paperclip runs at `paperclip.ing` and is open source (MIT license). ClawHive is the **desktop/Electron port** of this vision — same concept, same UI patterns, but native desktop app instead of web app.

### Why This Matters for ClawHive

Paperclip is the most directly relevant reference for ClawHive because:
1. It already has an OpenClaw Gateway adapter (`@paperclipai/adapter-openclaw-gateway`) that connects to OpenClaw via WebSocket
2. Its UI is a proven, production-grade control plane for OpenClaw agents
3. It defines the exact interaction model ClawHive should replicate
4. Its feature set is comprehensive — every feature ClawHive needs is already built and battle-tested

### Architecture Overview (Paperclip)

```
┌─────────────────────────────────────────────────────────────┐
│ UI (React + Tailwind + shadcn/ui + tanstack/react-query)   │
│ Routes: Dashboard, Issues, Projects, Goals, Agents,       │
│   Org Chart, Costs, Activity, Skills, Settings            │
└─────────────────────────────────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────────────────────────────────────────┐
│ Server (Node.js + Express + PostgreSQL)                   │
│ Routes: agents, issues, projects, goals, companies,      │
│   costs, activities, approvals, budgets, plugins, etc.   │
│ Services: heartbeat-run, plugin-host, cron, budgets       │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│ CLI (Node.js)                                              │
│ Commands: onboard, run, heartbeat-run, doctor, auth,     │
│   worktree, db-backup, configure                          │
│ Adapters: claude-local, codex-local, cursor-local,        │
│   gemini-local, openclaw-gateway, opencode-local, pi-local │
└─────────────────────────────────────────────────────────────┘
```

### OpenClaw Gateway Adapter (Critical for ClawHive)

Paperclip's `openclaw-gateway` adapter (`/Volumes/S/Projects/paperclip/packages/adapters/openclaw-gateway/`) shows exactly how to connect to OpenClaw:

**Transport:** WebSocket gateway protocol
- URL: `ws://` or `wss://`
- Connect flow: receive challenge → send `req connect` → send `req agent` → stream events
- Auth: `authToken`, `x-openclaw-token` header, or shared password

**Session Strategy:**
- `sessionKeyStrategy=issue|fixed|run`
- Session key sent as `agent.sessionKey`

**Payload:**
```typescript
{
  message: string,           // wake text + payloadTemplate
  idempotencyKey: string,   // Paperclip runId
  sessionKey: string,       // resolved strategy
  ...payloadTemplate fields
}
```

This adapter IS the blueprint for how ClawHive should integrate with OpenClaw's gateway.

### Core Concepts from Paperclip

#### 1. Heartbeats
Agents don't run continuously — they run in **heartbeats**: scheduled execution windows triggered by wakeup.

**Wakeup sources:** `timer` (scheduled), `assignment` (work assigned), `on_demand` (manual), `automation` (system-triggered)

**Session resume:** Heartbeats for the same task key reuse previous session. Different task keys keep separate session state. Reset available per-agent or per-task.

**CLI command:** `paperclip heartbeat-run --agent-id <id> --source timer --trigger ping`

#### 2. Companies (Multi-tenant)
Paperclip supports multi-company — one deployment, complete data isolation per company. ClawHive is single-user (single company), but the **company context pattern** (company switcher, company-scoped data) is worth modeling.

#### 3. Issues (Tasks)
Issues are the core work unit. Paperclip treats every conversation, decision, and task as an issue. Issues have:
- Status: Backlog → Todo → In Progress → In Review → Done (Cancelled, Blocked)
- Priority: Critical, High, Medium, Low
- Assignment: routed through org chart (CEO → Dept → Team → Agent)
- Full tool-call tracing and audit log

#### 4. Goals (Goal Alignment)
Goals trace every task back to the company mission. Task cards show goal ancestry — agents know what to do AND why.

#### 5. Org Chart
Hierarchical agent structure with reporting lines. Agents have bosses, titles, and job descriptions. Interactive tree visualization.

#### 6. Costs (Budget Control)
Monthly budgets per agent. When they hit the limit, they stop. Cost tracking with breakdowns by agent, project, model, time.

#### 7. Skills (Plugin System)
Skills are npm packages that agents can load. Plugin manager in the UI. Skills can be installed per company.

#### 8. Inbox (Governance)
Agents report to a board operator (human). Pending approvals, budget alerts, failed heartbeats all surface in the inbox. The operator is "the board" — they approve hires, override strategy, pause or terminate any agent.

### UI Layout Pattern (Paperclip)

**Three-zone layout:**
```
┌──────────┬────────────────────────────────────────────────┐
│          │  Breadcrumb bar                                │
│ Sidebar  ├──────────────────────────┬─────────────────────┤
│ (240px)  │  Main content            │  Properties panel   │
│          │  (flex-1)                │  (320px, optional) │
│          │                          │                     │
└──────────┴──────────────────────────┴─────────────────────┘
```

**Sidebar sections (from `Sidebar.tsx`):**
- Company header: company switcher dropdown, search, new issue button
- Personal: Inbox (with badge), My Issues
- Work: Issues, Routines (Beta), Goals
- Projects: collapsible project list
- Agents: collapsible agent list with live status
- Company: Dashboard, Org Chart, Agents, Costs, Activity, Settings

**Color system (from `ui.md`):**
- Background: `hsl(220, 13%, 10%)` dark charcoal
- Surface: `hsl(220, 13%, 13%)`
- Border: `hsl(220, 10%, 18%)`
- Accent: `hsl(220, 80%, 60%)` muted blue

**Status colors:**
- Backlog: gray, Todo: gray-blue, In Progress: yellow, In Review: violet, Done: green, Blocked: amber

**Design principles:**
- Dense but scannable — max info without clicks
- Keyboard-first: Cmd+K search, `C` for new issue
- Contextual, not modal — inline editing over dialogs
- Dark theme default

### Agent Configuration Pattern

From `AgentConfigForm.tsx` — agents are configured with:
- Adapter type (claude_local, codex_local, openclaw_gateway, http, etc.)
- Prompt template (Markdown editor with variable support: `{{agent.id}}`, `{{agent.name}}`)
- Working directory and execution limits (timeout, grace period)
- Environment variables
- Heartbeat policy: enabled, interval, wake on assignment/on demand/automation
- Budget policy
- Reports to (org chart reporting line)

### Onboarding Wizard Pattern

From `OnboardingWizard.tsx` — multi-step wizard with:
1. Company setup (name, goal, brand color)
2. Agent hire (adapter type, prompt, model)
3. Goal definition
4. Launch

Steps include adapter type selection (claude_local, codex_local, openclaw_gateway, etc.), runtime config, and initial goal setting.

### Optimization Button Concept

**User requirement:** When creating agents.md, tools.md, soul.md, heartbeat.md — there should be an "Optimize" button that uses AI to improve the document.

**Paperclip's approach (study):** Paperclip's agent configuration uses:
- `promptTemplate` — base prompt with `{{variables}}`
- Inline `MarkdownEditor` — structured editing with preview
- `agent-config-primitives.tsx` — field definitions with help text

**Implementation approach for ClawHive:**
- Each document (agents.md, tools.md, soul.md, heartbeat.md) is a structured Markdown file
- "Optimize" button triggers an LLM with a user-customizable prompt context (stored in Settings)
- Default optimization context: "Improve this document for clarity, completeness, and effectiveness. Fix any inconsistencies, add missing sections, and ensure the tone matches the agent's role."
- Optimization prompt is editable in Settings → Optimization section
- The optimized output is shown in a diff view, user can accept/reject

### Key UI Components to Adopt

| Component | File in Paperclip | Purpose |
|-----------|-------------------|---------|
| `Sidebar.tsx` | `ui/src/components/` | Primary navigation with collapsible sections |
| `Layout.tsx` | `ui/src/components/` | Three-zone shell with company rail |
| `SidebarAgents.tsx` | `ui/src/components/` | Agent list with live status dots |
| `AgentDetail.tsx` | `ui/src/pages/` | Agent config + runs + transcripts |
| `OnboardingWizard.tsx` | `ui/src/components/` | Multi-step first-launch wizard |
| `CommandPalette.tsx` | `ui/src/components/` | Cmd+K global search |
| `NewIssueDialog.tsx` | `ui/src/components/` | Quick task creation |
| `BreadcrumbBar.tsx` | `ui/src/components/` | Navigation + entity actions |
| `StatusBadge.tsx` | `ui/src/components/` | Consistent status/priority indicators |
| `PageTabBar.tsx` | `ui/src/components/` | Tab navigation within detail pages |
| `PropertiesPanel.tsx` | `ui/src/components/` | Right-side contextual panel |

### CLI Commands to Understand

| Command | Purpose |
|---------|---------|
| `onboard` | Interactive setup wizard (database, LLM, storage, secrets) |
| `heartbeat-run` | Execute agent heartbeat with full event streaming |
| `run` | Start server or run agent |
| `worktree` | Worktree management (Git worktree integration) |
| `doctor` | Health check and diagnostics |
| `auth-bootstrap-ceo` | Bootstrap initial CEO agent + company |

### Auto-Update Compatibility

**User requirement:** Leave compatible with Paperclip features and auto-update when Paperclip has new updates.

**Approach:** ClawHive is NOT Paperclip. It adopts Paperclip's UI patterns and interaction model, but targets a different runtime (desktop native). However:
- Both should support the same agent configuration schema (agents.md, tools.md, soul.md, heartbeat.md formats)
- ClawHive should track Paperclip's spec docs (`doc/spec/`) as a reference for interaction patterns
- The OpenClaw Gateway adapter format should remain compatible with Paperclip's adapter config

### Pre-built Org on GitHub

**User requirement:** Pre-build org on GitHub — ability to import org structures.

**Paperclip approach:** `CompanyExport.tsx` and `CompanyImport.tsx` with `company-portability.ts` service. Export/import includes:
- Company structure (org chart, roles)
- Agent configurations
- Skills
- Secrets (scrubbed with user confirmation)
- Collision handling for conflicts

**ClawHive adoption:** Implement `import-org` and `export-org` as features in Phase 3+ (Multi-Agent Core). Phase 1 just needs the data model to support this.

### Files to Reference for Deep Implementation

```
/Volumes/S/Projects/paperclip/
├── ui/src/components/Sidebar.tsx          — navigation pattern
├── ui/src/components/Layout.tsx         — shell architecture
├── ui/src/components/OnboardingWizard.tsx — wizard pattern
├── ui/src/components/AgentConfigForm.tsx  — agent config pattern
├── ui/src/components/AgentDetail.tsx     — agent detail page
├── ui/src/components/SidebarAgents.tsx   — agent list with live status
├── ui/src/components/CommandPalette.tsx  — global search (Cmd+K)
├── ui/src/pages/Agents.tsx               — agent list page
├── ui/src/pages/Dashboard.tsx           — dashboard page
├── ui/src/pages/Org.tsx                 — org chart page
├── ui/src/pages/Costs.tsx               — cost tracking page
├── ui/src/pages/Goals.tsx               — goals page
├── ui/src/pages/Activity.tsx            — activity log page
├── ui/src/pages/Inbox.tsx               — inbox/governance page
├── doc/spec/ui.md                       — UI design spec
├── doc/spec/agents-runtime.md           — agent runtime spec
├── packages/adapters/openclaw-gateway/  — OpenClaw integration
└── cli/src/commands/heartbeat-run.ts   — heartbeat execution
```

---

*Research for: 01-foundation*
*Sources: STACK.md, ARCHITECTURE.md, SUMMARY.md, PITFALLS.md, OpenClaw SDK exploration (package.json exports, plugin-sdk, sessions, config patterns), Paperclip repo analysis (/Volumes/S/Projects/paperclip/)*
