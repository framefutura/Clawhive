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

## Phases

- [x] **Phase 1: Foundation** — Secure Electron shell, basic single-agent chat, IPC bridge
- [x] **Phase 2: Workspace & Control Plane** — Multi-tab workspace, Cyber Workspace, file system, built-in browser
- [x] **Phase 3: Security Core** — Per-task security levels, privacy guard, sandboxed execution, approval gates
- [ ] **Phase 4.01: Agent Registry Foundation** — Agent CRUD, role templates, lifecycle, permissions, storage structure
- [ ] **Phase 4.02: Agent Registry UI** — Interactive org tree, view modes, drag-drop, editor, Secretary/CEO agents
- [ ] **Phase 4.03: Task Router** — Heartbeat scheduling, delegation, user override, workload balancing, security propagation
- [ ] **Phase 4.04: Team Manager** — Agent/team storage, hybrid memory, sharing, collaboration, monitoring, coaching, OKR
- [ ] **Phase 4.05: A2A Messaging Foundation** — Message bus pipeline, direct messaging, leader-to-leader
- [ ] **Phase 4.06: A2A Escalation & Hub** — Approval chains, configurable paths, secretary bridge, message hub
- [ ] **Phase 4.07: A2A Security & Coaching** — PrivacyGuard A2A scan, self-improvement flows, subagent parent ask
- [ ] **Phase 5: Advanced Features** — Plan-first mode, knowledge bases, accounting/reports, skills & scheduling
- [ ] **Phase 6: Polish & Distribution** — i18n, auto-update, DMG packaging

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
- [x] 01-01: Project scaffolding
- [x] 01-02: OpenClaw SDK integration
- [x] 01-03: Core UI
- [x] 01-04: Local storage
- [x] 01-GAPS: Gap closure

---

## Phase 2: Workspace & Control Plane

**Status:** Complete
**Goal:** Build the visual and operational surface that agents operate within: multi-tab workspace, Cyber Workspace with Blackboard, unified file system with format plugins, built-in browser, and agent-to-agent message bus foundation
**Depends on:** Phase 1
**Requirements:** FND-06, FND-08; WKP-01 through WKP-10
**Success Criteria:**
1. User can create, delete, and rename tabs; tabs auto-name based on content
2. Blackboard shows active genes, current task, and agent status with ambient glow
3. File manager can open, create, and preview Markdown, PDF, Word, and Excel files
4. Built-in browser renders web pages and can capture page content for agents
5. Workspaces are isolated at the file-system level (~/.clawhive/workspaces/<id>/)
6. Agent-to-agent message protocol is established in the IPC layer

**Plans:** 4 plans (all complete)
- [x] 02-01: Tab System
- [x] 02-02: Cyber Workspace
- [x] 02-03: File System & Formats
- [x] 02-04: Built-in Browser

---

## Phase 3: Security Core

**Status:** Complete
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

**Plans:** 5 plans (all complete)
- [x] 03-01: Security Manager
- [x] 03-02: Privacy Guard
- [x] 03-03: Sandboxed Bridge
- [x] 03-04: Approval Gates
- [x] 03-05: Security Hardening

---

## Phase 4: Multi-Agent Core

**Status:** In Progress
**Goal:** Implement hierarchical multi-agent system with CEO-to-agent structure, heartbeat-based task routing, team collaboration, and agent-to-agent prompt delegation
**Depends on:** Phase 3

---

### Phase 4.01: Agent Registry Foundation

**Goal:** Core agent registry: create, read, update, delete agents with configurable roles, 7 predefined role templates, hybrid lifecycle, permissions inheriting Phase 3 Security Core, and file-system storage structure
**Depends on:** Phase 3
**Requirements:** AGENT-01 (partial), AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-21 (partial)
**Success Criteria (what must be TRUE):
1. User can create an agent and assign it one of 7 predefined role templates (CEO, CFO, COO, Dept Head, Team Leader, Individual Agent, Secretary), each with explicit functions and decision-making authority
2. User can configure agent lifecycle as persistent, ephemeral, or user-chooses-per-agent
3. User can perform full agent CRUD: create, read, update, delete, and archive agents
4. Agent role permissions inherit from Phase 3 Security Core roles (SEC-08); permission changes in Security Core propagate to agent permissions
5. Agent storage directories are created at ~/.clawhive/agents/<id>/ on agent creation

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

---

### Phase 4.02: Agent Registry UI

**Goal:** Interactive org tree visualization with live status overlay, 3 view modes, drag-drop reparenting with cycle detection, paperclip-style interaction editor, and CEO/Secretary special agents with rich self-referential docs
**Depends on:** Phase 4.01
**Requirements:** AGENT-01 (partial), AGENT-02, AGENT-07, AGENT-08, AGENT-09, AGENT-10, AGENT-11, AGENT-12, AGENT-13, AGENT-14, AGENT-15
**Success Criteria (what must be TRUE):
1. User can view the agent hierarchy in left pane with live status indicators (busy/idle/error) updating in real time
2. User can switch between all 3 view modes: hierarchical tree, company org chart, and teams+flat-roles
3. User can drag-drop agents to reparent them across all 3 org modes; the system detects and blocks circular parent-child relationships before saving
4. User can create agents with custom roles, responsibilities, and rich identity docs (soul.md, heartbeat.md, tools.md, agents.md); user can edit all agent-specific docs
5. User can edit all 7 predefined role templates: modify soul.md, heartbeat.md, tools.md, agents.md, and interaction.md for each role
6. Secretary agent appears in org tree, acts as full agent in hierarchy, and serves as system-level approval interface bridging top leader to user
7. CEO agent appears in org tree with self-improving overseer docs that reference all sub-agents and company structure

**Plans:** 1 plan
- [ ] 04-05-PLAN.md — Interaction editor, agent docs, Secretary/CEO agents, role template editing (AGENT-11, AGENT-13, AGENT-14, AGENT-15)

---

### Phase 4.03: Task Router

**Goal:** Heartbeat-based task orchestration: configurable per-agent heartbeat intervals with skip-if-busy guard, parent auto-delegation down hierarchy, user override to pick agent or assign team, workload balancing, and delegation chain security level propagation
**Depends on:** Phase 4.02
**Requirements:** AGENT-16, AGENT-17, AGENT-18, AGENT-19, AGENT-20
**Success Criteria (what must be TRUE):
1. Each agent has a configurable heartbeat interval; when an agent is busy (handling in-flight work), the scheduler skips its turn (sql.js WASM skip-if-busy guard)
2. When a parent agent receives a task, it automatically delegates down the hierarchy to an appropriate child based on role and availability
3. User can override the automatic delegation path: pick a specific agent or assign a task to an entire team for collaboration
4. Tasks are distributed across available sub-agents based on current workload (number of active tasks, not just idle/busy status)
5. Delegation chains carry the originatingSecurityLevel from the original task; child agent execution is capped at min(parentLevel, childLevel) at every hop

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

---

### Phase 4.04: Team Manager

**Goal:** Team collaboration infrastructure: agent and team storage isolation, hybrid shared+private memory, selective conversation sharing, team task collaboration, leader monitoring and correction, leader coaching with feedback loops, and full OKR system with leader dashboard
**Depends on:** Phase 4.03
**Requirements:** AGENT-21 (partial), AGENT-22, AGENT-23, AGENT-24, AGENT-25, AGENT-26, AGENT-27
**Success Criteria (what must be TRUE):
1. Each team has a shared storage directory at ~/.clawhive/teams/<team-id>/ accessible to all team members; agents retain private storage at ~/.clawhive/agents/<id>/
2. Each agent has both shared team memory (accessible to team peers) and private context (only the agent can read)
3. User can selectively share specific messages or threads from an agent's conversation with team peers; sharing is explicit, not automatic
4. Multiple agents on the same team can work on a shared task with pooled context from the team shared storage
5. Team leaders can see sub-agent work status and proactively correct errors or issues
6. Leaders provide structured coaching feedback to sub-agents, forming a continuous improvement loop
7. User can set OKRs (Objectives and Key Results) per team/agent; periodic reviews are visible in the leader dashboard

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

---

### Phase 4.05: A2A Messaging Foundation

**Goal:** Core agent-to-agent messaging: 6-stage message bus pipeline (validation, content filter, rate limit, routing, circuit breaker, audit), direct agent messaging for task handoffs/discussions/suggestions, and leader-to-leader A2A across organizational branches
**Depends on:** Phase 4.04
**Requirements:** AGENT-28, AGENT-29, AGENT-36 (partial)
**Success Criteria (what must be TRUE):
1. Any agent can send a structured message to any other agent; messages carry sender ID, target pane/session, and reply routing
2. Any leader agent can send a message to any other leader agent across different organizational branches
3. Every A2A message traverses the 6-stage message bus pipeline: validation (schema check) → content filter → rate limit → routing → circuit breaker → audit logging, in order

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

---

### Phase 4.06: A2A Escalation & Hub

**Goal:** Escalation routing and leader message hub: requests/decisions route to immediate leader, superior leader approval chains, configurable escalation paths (CEO routes to secretary or user), secretary as configurable bridge, and leader message hub with full team-wide and per-agent message visibility
**Depends on:** Phase 4.05
**Requirements:** AGENT-30, AGENT-31, AGENT-32, AGENT-33, AGENT-34
**Success Criteria (what must be TRUE):
1. When an agent makes a request or decision that requires approval, it routes to the agent's immediate leader for review
2. If the immediate leader cannot approve, the request escalates up the chain to the next superior leader until resolved
3. User can configure per-category escalation paths: CEO decisions route to either secretary or directly to user depending on decision type
4. Secretary agent receives all top-level escalations, formats them for user review, and relays the user's decisions back to the requesting agent
5. Leaders see a message hub showing all team-wide communications and per-agent message threads; leaders can filter by type (handoff, discussion, suggestion, escalation)

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

---

### Phase 4.07: A2A Security & Coaching

**Goal:** Security-hardened A2A: PrivacyGuard.detectSuspicious() scan on all A2A messages before delivery, subagent can ask parent for guidance when stuck, and self-improvement/coaching flows route through the leadership hierarchy
**Depends on:** Phase 4.06
**Requirements:** AGENT-35, AGENT-36 (partial), AGENT-37, AGENT-38
**Success Criteria (what must be TRUE):
1. Every A2A message is scanned by PrivacyGuard.detectSuspicious() before delivery; suspicious messages are blocked, logged, and the sender is notified
2. When a subagent is stuck or lacks knowledge to complete a task, it can send a guidance request to its parent agent; the parent responds with direction
3. Self-improvement requests from sub-agents route up the leadership chain (agent → leader → superior) until reaching a level with authority to approve changes
4. Coaching feedback from leaders (Phase 4.04) is delivered via the A2A message bus and archived in the agent's private context for future reference

**Plans:** 1 plan
- [ ] 04-06-PLAN.md — Agent/team storage isolation, teams SQL schema, IPC handlers (AGENT-21 gap closure)

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
- [ ] 05-01: Plan Engine
- [ ] 05-02: Knowledge Base
- [ ] 05-03: Accounting & Reports
- [ ] 05-04: Skills & Scheduling

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
- [ ] 06-01: Internationalization
- [ ] 06-02: Distribution
- [ ] 06-03: Polish

---

## Progress

| Phase | Milestone | Plans Complete | Status |
|-------|-----------|----------------|--------|
| 1. Foundation | v1.0 | 5/5 | Complete |
| 2. Workspace & Control Plane | v1.0 | 4/4 | Complete |
| 3. Security Core | v1.0 | 5/5 | Complete |
| 4.01. Agent Registry Foundation | v1.1 | 0/? | Planned |
| 4.02. Agent Registry UI | v1.1 | 0/? | Planned |
| 4.03. Task Router | v1.1 | 0/? | Planned |
| 4.04. Team Manager | v1.1 | 0/? | Planned |
| 4.05. A2A Messaging Foundation | v1.1 | 0/? | Planned |
| 4.06. A2A Escalation & Hub | v1.1 | 0/? | Planned |
| 4.07. A2A Security & Coaching | v1.1 | 0/? | Planned |
| 5. Advanced Features | v1.0 | 0/4 | Planned |
| 6. Polish & Distribution | v1.0 | 0/3 | Planned |

---

## Architecture Fusion Summary

### Adopted from Paperclip
- **Heartbeat scheduler** → Phase 4.03 Task Router (`heartbeat_runs`, task checkout, atomic execution)
- **Budget / cost events** → Phase 5 Accounting (`cost_events`, token rollup, per-task budgets)
- **Approval gates** → Phase 3 Security Core (`approvals`, activity log)
- **Task/ticket system** → Phase 4.03 Task Router (task checkout, execution state machine)
- **Multi-company org tree** → Deferred to v2 (single workspace hierarchy for MVP)

### Adopted from NoDeskClaw
- **Cyber Workspace** → Phase 2 (workspace + blackboard, boundary-operable UI)
- **Gene System** → Phase 1-2 (8 categories: dev, data, ops, network, creative, comm, security, efficiency)
- **Hex topology visualization** → Phase 2 Cyber Workspace (SVG zoomable topology graph)
- **Message bus middleware** → Phase 4.05 A2A Messaging (6-stage pipeline)
- **Memory layers** → Phase 4.04 Team Manager (session context → working memory → persistent KB)

### Adopted from smux
- **Agent-to-agent messaging** → Phase 4.05-4.07 A2A Messaging
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
| 2026-03-30 | Insert Phase 2: Workspace & Control Plane | Multi-tab, browser, and file system are foundational surfaces agents operate on |
| 2026-03-30 | Defer multi-company to v2 | Adds tenant isolation complexity without MVP validation |
| 2026-03-30 | Defer external agent adapters to v2 | Architecture预留 (A2A message bus), but full Claude Code/Codex bridge needs more stability |
| 2026-03-30 | Move accounting/budget to Phase 5 | Requires task router (Phase 4) and knowledge base (Phase 5) to close the improvement loop |
| 2026-03-30 | Format plugins (PDF/MD/DOCX/XLSX) in Phase 2 | Part of the unified file system foundation; audio/video预留 as v2 plugins |
| 2026-03-31 | Expand Phase 4 into 7 sub-plans | Agent Registry split into foundation (04-01) and UI (04-02); Agent Messaging split into foundation (04-05), escalation (04-06), and security/coaching (04-07) to reflect natural delivery boundaries and the 38 requirement expansion |
| 2026-03-31 | Split Agent Registry at 15 requirements | Foundation (CRUD, templates, lifecycle, permissions, storage) builds before UI (org tree, view modes, drag-drop, editor, Secretary/CEO agents) — clear dependency |
| 2026-03-31 | Split Agent Messaging at 11 requirements | Foundation (pipeline, direct, leader-to-leader) before escalation (approval chains, hub) before security (PrivacyGuard scan, coaching flows) — each layer builds on previous |

---

*Roadmap created: 2026-03-28*
*Last updated: 2026-03-31 — Phase 4 expanded to 7 sub-plans covering 38 requirements*
