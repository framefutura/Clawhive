# Roadmap: ClawHive

## Overview

ClawHive fuses three architectural lineages into a unified desktop multi-agent platform:
- **Paperclip** → heartbeat-based orchestration, task/ticket system, budget/accounting, approval gates
- **NoDeskClaw** → Cyber Workspace, Gene System, hex topology, message bus middleware, memory layers
- **smux** → agent-to-agent prompt delegation via structured messaging with reply routing

The roadmap delivers visual workspace foundations first, then security infrastructure, then multi-agent hierarchy, then advanced intelligence features.

## Phase Numbering

- Integer phases (1–6): Planned milestone work
- Decimal phases (e.g. 5.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

---

## Phase 1: Foundation

**Status:** Complete
**Goal:** Establish secure Electron shell with OpenClaw SDK integration, basic single-agent chat, and IPC bridge
**Depends on:** Nothing
**Requirements:** FND-01 through FND-10
**Success Criteria:**
1. User can install app via DMG to custom location and launch successfully
2. User can have a conversation with a single AI agent through chat interface
3. Chat history persists in local encrypted SQLite database
4. Multiple model providers (Anthropic, OpenAI, Ollama) work correctly
5. Dark/light mode toggle works with system-aware default
6. IPC bridge established between Electron main process and renderer

**Plans:** 5 plans (all complete)
- [x] 01-01: Project scaffolding — pnpm workspace, TypeScript, Vite, Electron main process
- [x] 01-02: OpenClaw SDK integration — Agent runtime, skill loader, session manager, IPC bridge
- [x] 01-03: Core UI — React app with chat interface, model selector, dark/light mode
- [x] 01-04: Local storage — SQLite setup, encryption, session persistence, config management
- [x] 01-GAPS: Gap closure — Ollama auto-detection, gateway CLI check, expanded unit tests

---

## Phase 2: Workspace & Control Plane

**Status:** Complete
**Goal:** Build the visual and operational surface that agents operate within: multi-tab workspace, Cyber Workspace with Blackboard, unified file system with format plugins, built-in browser, and agent-to-agent message bus foundation
**Depends on:** Phase 1
**Requirements:** FND-06, FND-08 (remaining foundation items); WKP-01 through WKP-10 (new)
**Success Criteria:**
1. User can create, delete, and rename tabs; tabs auto-name based on content
2. Blackboard shows active genes, current task, and agent status with ambient glow
3. File manager can open, create, and preview Markdown, PDF, Word, and Excel files
4. Built-in browser renders web pages and can capture page content for agents
5. Workspaces are isolated at the file-system level (~/.clawhive/workspaces/<id>/)
6. Agent-to-agent message protocol is established in the IPC layer

**Plans:** 4 plans (all complete)
- [x] 02-01: Tab System — Multi-tab workspace, CRUD lifecycle, auto-naming heuristics, tab state persistence
- [x] 02-02: Cyber Workspace — Blackboard component, workspace isolation, hex topology visualization foundation
- [x] 02-03: File System & Formats — Unified file manager, plugin-based format registry (MD, PDF, DOCX, XLSX), media format extensibility hooks
- [x] 02-04: Built-in Browser — Electron webview/Playwright integration, page capture, basic web automation IPC

---

## Phase 3: Security Core

**Status:** Next phase — ready to plan
**Goal:** Build security infrastructure with per-task security levels, privacy guard, sandboxed execution, and approval gates before scaling to multi-agent
**Depends on:** Phase 2
**Requirements:** SEC-01 through SEC-10
**Success Criteria:**
1. User can select security level (high/medium/low) when starting a task
2. High security tasks prompt for approval on all actions
3. Privacy guard blocks sensitive paths and allows user-defined safe zones
4. Suspicious patterns (credential access, shell injection) are detected and blocked
5. Tool permissions follow deny-by-default policy
6. Approval gates log decisions to an immutable activity log

**Plans:** 3 plans
- [ ] 03-01: Security Manager — Per-task security levels, approval workflows, role-based permissions
- [ ] 03-02: Privacy Guard — Path blocking, safe zones, suspicious pattern detection, audit logging
- [ ] 03-03: Sandboxed Bridge — Isolated code execution, tool permission system, deny-by-default policy, circuit breakers (100 call cap)

---

## Phase 4: Multi-Agent Core

**Status:** Planned
**Goal:** Implement hierarchical multi-agent system with CEO-to-agent structure, heartbeat-based task routing, team collaboration, and agent-to-agent prompt delegation
**Depends on:** Phase 3
**Requirements:** AGENT-01 through AGENT-12
**Success Criteria:**
1. User can create agents with roles (CEO, CFO, COO, Department Head, Team Leader, Individual Agent)
2. Tasks route through hierarchy (CEO delegates to Dept → Team → Agent) with heartbeat scheduling
3. Agents in same team can collaborate with shared memory and selective conversation sharing
4. Organization tree displays hierarchy visually in left pane
5. Task assignment works for single agent, multiple agents, or team collaboration
6. Agents can send prompts to other agents via structured messages with reply routing (smux-style)

**Plans:** 4 plans
- [ ] 04-01: Agent Registry — Agent CRUD, role assignment, hierarchy management, organization tree UI
- [ ] 04-02: Task Router — Heartbeat-based orchestration, hierarchy-based routing, workload balancing, delegation flow
- [ ] 04-03: Team Manager — Team collaboration, shared memory, selective conversation sharing, team workspaces
- [ ] 04-04: Agent Messaging — Full A2A prompt delegation, message bus middleware (validation → filter → rate limit → routing → circuit breaker → audit)

---

## Phase 5: Advanced Features

**Status:** Planned
**Goal:** Add differentiating features — plan-first mode, knowledge bases, browser control, accounting/budget闭环, scheduled tasks, and assessment reports
**Depends on:** Phase 4
**Requirements:** ADV-01 through ADV-12
**Success Criteria:**
1. Plan-first mode requires agent to submit plan before execution with user approval
2. Agents can use knowledge bases from files, folders, Obsidian, and Notion
3. Skills can be installed per agent via npm
4. MCP servers can be configured per agent
5. Per-task token budgets are tracked; over-budget requests trigger parent analysis
6. Team leaders generate assessment reports that aggregate up hierarchy

**Plans:** 4 plans
- [ ] 05-01: Plan Engine — Plan-first mode, user approval checkpoints, plan visualization
- [ ] 05-02: Knowledge Base — File/folder indexing, Obsidian vault, Notion workspace integration
- [ ] 05-03: Accounting & Reports — Budget assignment, token cost events, parent analysis, knowledge-base synthesis of improvements
- [ ] 05-04: Skills & Scheduling — NPM skill installation, MCP server configuration, recurring tasks, browser control integration

---

## Phase 6: Polish & Distribution

**Status:** Planned
**Goal:** Final UX polish, internationalization, and distribution mechanism for production release
**Depends on:** Phase 5
**Requirements:** POL-01 through POL-09
**Success Criteria:**
1. UI supports English and Chinese with complete translation
2. Auto-update checks monthly and prompts user (no silent updates)
3. macOS TCC permissions handled gracefully without crashes
4. First-launch wizard guides agent creation and config import
5. DMG distribution works with code signing and notarization

**Plans:** 3 plans
- [ ] 06-01: Internationalization — i18n setup, English/Chinese translations, language toggle
- [ ] 06-02: Distribution — Auto-update system, DMG packaging, code signing, notarization
- [ ] 06-03: Polish — First-launch wizard, config import, macOS TCC handling, performance optimization

---

## Progress

| Phase | Milestone | Plans Complete | Status |
|-------|-----------|----------------|--------|
| 1. Foundation | v1.0 | 5/5 | Complete |
| 2. Workspace & Control Plane | v1.0 | 4/4 | Complete |
| 3. Security Core | v1.0 | 0/3 | Ready to plan |
| 4. Multi-Agent Core | v1.0 | 0/4 | Planned |
| 5. Advanced Features | v1.0 | 0/4 | Planned |
| 6. Polish & Distribution | v1.0 | 0/3 | Planned |

---

## Architecture Fusion Summary

### Adopted from Paperclip
- **Heartbeat scheduler** → Phase 4 Task Router (`heartbeat_runs`, task checkout, atomic execution)
- **Budget / cost events** → Phase 5 Accounting (`cost_events`, token rollup, per-task budgets)
- **Approval gates** → Phase 3 Security Core (`approvals`, activity log)
- **Task/ticket system** → Phase 4 Task Router (task checkout, execution state machine)
- **Multi-company org tree** → Deferred to v2 (single workspace hierarchy for MVP)

### Adopted from NoDeskClaw
- **Cyber Workspace** → Phase 2 (workspace + blackboard, boundary-operable UI)
- **Gene System** → Phase 1-2 (8 categories: dev, data, ops, network, creative, comm, security, efficiency)
- **Hex topology visualization** → Phase 2 Cyber Workspace (SVG zoomable topology graph)
- **Message bus middleware** → Phase 4 Agent Messaging (8-stage pipeline)
- **Memory layers** → Phase 4 Team Manager (session context → working memory → persistent KB)

### Adopted from smux
- **Agent-to-agent messaging** → Phase 4 Agent Messaging
- **Read-guard pattern** → Message bus validation layer (must read context before acting)
- **Structured prompt delegation** → Agents send prompts with sender ID, target pane/session, and reply routing
- **Any bash-capable agent** → Future expansion: external adapters for Claude Code, Codex, OpenCode

### New User Requirements
- **Multi-tab workspace** → Phase 2 Tab System
- **Built-in browser + web automation** → Phase 2 Built-in Browser (Electron webview + Playwright)
- **Unified file system** → Phase 2 File System & Formats
- **Document format support (PDF, MD, DOCX, XLSX)** → Phase 2-3 format plugin architecture
- **Media format extensibility** → Plugin interface预留 for audio/video in v2

---

## Future Expansion (v2+)

These features are architecturally预留 but explicitly excluded from v1 MVP to prevent scope creep.

### Organization & Scale
- **Multi-company / multi-tenant** — Separate org trees, isolated accounting, cross-company boundaries
- **External agent adapters** — Claude Code, Codex, OpenCode, Gemini CLI via bash/IPC bridge
- **Performance analytics** — Heatmaps, bottleneck identification, topology audit

### Messaging & Collaboration
- **WhatsApp integration** for agent messaging
- **Telegram integration** for agent messaging
- **Slack integration** for team notifications
- **iMessage integration** for macOS native messaging
- **Real-time collaborative editing** — Multiple users editing same document

### Office & Productivity
- **Google Workspace integration** (docs, sheets, slides, gmail)
- **Microsoft Office integration** (documents, outlook)
- **Feishu document creation**

### Platform Expansion
- **Windows native port**
- **Linux native port**
- **Mobile companion app** (iOS/Android)

### Media & Advanced Formats
- **Audio format plugins** — waveform visualization, transcription
- **Video format plugins** — frame extraction, clip trimming

### Explicitly Out of Scope (Even for v2)
- **Cloud sync** — Privacy-first, bank-level security promise, no data exposure risk
- **Silent auto-updates** — User should control when updates apply

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-28 | Original 5-phase roadmap | Foundation → Security → Multi-Agent → Advanced → Polish |
| 2026-03-30 | Insert Phase 2: Workspace & Control Plane | Multi-tab, browser, and file system are foundational surfaces agents operate on; they must exist before scaling to multi-agent |
| 2026-03-30 | Defer multi-company to v2 | Adds tenant isolation complexity without MVP validation |
| 2026-03-30 | Defer external agent adapters to v2 | Architecture预留 (A2A message bus), but full Claude Code/Codex bridge needs more stability |
| 2026-03-30 | Move accounting/budget to Phase 5 | Requires task router (Phase 4) and knowledge base (Phase 5) to close the improvement loop |
| 2026-03-30 | Format plugins (PDF/MD/DOCX/XLSX) in Phase 2 | Part of the unified file system foundation; audio/video预留 as v2 plugins |

---

*Roadmap created: 2026-03-28*
*Last updated: 2026-03-30 — fused Paperclip + NoDeskClaw + smux architectures*
