# Phase 1: Foundation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish secure Electron shell with OpenClaw SDK integration and basic single-agent chat functionality. Users can install app via DMG, have conversations with a single AI agent through a React-based chat interface, and chat history persists locally in encrypted SQLite database. Multiple model providers work correctly
 and toggle between dark and light mode.

</domain>

<decisions>
## Implementation Decisions

### Chat UI Design
- **Layout:** Fixed sticky input with side-by-side panes — left panel lists agent and teams, right panel for chat
- **Message format:** Markdown with rich formatting (code blocks, tables, file attachments rendered inline)
- **Ambient feedback:** Glow pulse effect around input during agent work — no progress bar

### Model Selection UX
- **Model picker location:** Top bar dropdown ( always visible above input
- **API key management:** Dedicated settings page
- **Default behavior:** Remember last provider on app restart
- **Ollama/local models:** Auto-discover via custom provider pattern + manual base URL entry
- **Model list:** Fetch from provider API dynamically
- **Model exploration:** Continue chatting option — explore models in sidebar

### File Upload Interactions
- **Drop zone:** Drop zone on input area ( supports both drag-drop and file picker
- **Clipboard paste:** Both options available
- **File preview:** Send immediately without confirmation

### Installation & First launch
- **Data path:** Native picker dialog for user selects custom data storage location
- **First-launch wizard:** Quick setup — create first agent with name, role, responsibilities, default model provider, skip advanced config

### Claude's Discretion
- Loading skeleton design during loading states
- Empty state illustrations
- Exact spacing and typography
- Error state handling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary Design Reference
- `/Volumes/S/Projects/paperclip/` — Paperclip GitHub repo, canonical reference for ClawHive's UI/UX. ClawHive is the desktop port of Paperclip's interaction model. Key files:
  - `doc/spec/ui.md` — UI design spec (color system, typography, layout, sidebar)
  - `doc/spec/agents-runtime.md` — Agent heartbeat, session resume, adapter patterns
  - `packages/adapters/openclaw-gateway/` — OpenClaw Gateway WebSocket protocol
  - `ui/src/components/Sidebar.tsx` — Sidebar with collapsible sections
  - `ui/src/components/Layout.tsx` — Three-zone shell (sidebar + main + properties panel)
  - `ui/src/components/OnboardingWizard.tsx` — First-launch wizard

### OpenClaw Integration
- `src/plugin-sdk/index.ts` — SDK entry point
- `src/gateway/client.ts` — Gateway WebSocket client
- `src/sessions/` — Session management patterns
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **OpenClaw SDK (`src/`)** Agent runtime, skill loader, session manager, peer communication — foundational for ClawHive
- **src/infra/**: Error handling patterns, path aliases, config loading
- **ui/src/**: Lit web components — could inform styling patterns ( approach

### Established Patterns
- **pnpm workspace**: Monorepo structure matching OpenClaw's setup
- **TypeScript ESM**: NodeNext module resolution, strict mode
- **Colocated tests**: `.test.ts` files next to source
- **contextBridge IPC**: Secure Electron communication between main and renderer

### Integration Points
- **src/plugin-sdk/index.ts**: SDK entry point for agent/skill/session capabilities
- **src/agents/agent.ts**: Agent creation and management patterns
- **src/gateway/client.ts**: Gateway client for WebSocket communication ( could enable real-time updates
- **src/sessions/**: Session persistence patterns
- **src/config/**: Configuration loading utilities

</code_context>

<specifics>
## Specific Ideas

- Chat should feel clean and uncluttered, like Linear's issue cards
- Glow should be subtle, not distracting
- Quick setup for respects user's time

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-28*
