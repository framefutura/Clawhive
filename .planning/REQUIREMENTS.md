# Requirements: ClawHive

**Defined:** 2026-03-28
**Core Value:** Users can safely delegate complex tasks to autonomous agent teams while maintaining complete control over system access, privacy, and security

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation (Phase 1)

- [x] **FND-01**: User can install app via DMG to any location (portable install)
- [x] **FND-02**: App launches with secure Electron shell (contextIsolation, sandbox enabled)
- [x] **FND-03**: User can select custom data storage path on first launch
- [x] **FND-04**: User can chat with a single AI agent through React-based chat interface
- [x] **FND-05**: User can select model from multiple providers (Anthropic, OpenAI, Ollama)
- [ ] **FND-06**: User can upload files and images to chat (drag-drop, clipboard, file picker)
- [x] **FND-07**: Chat history persists locally in encrypted SQLite database
- [ ] **FND-08**: User can toggle between dark and light mode (system-aware default)
- [x] **FND-09**: App displays ambient visual feedback (glow/pulse) during agent work
- [x] **FND-10**: IPC bridge established between Electron main process and renderer

### Workspace & Control Plane (Phase 2)

- [x] **WKP-01**: User can create, delete, and rename tabs
- [x] **WKP-02**: Tabs auto-name based on content
- [x] **WKP-03**: Blackboard shows active genes, current task, agent status
- [x] **WKP-04**: File manager can open, create, preview Markdown, PDF, Word, Excel
- [x] **WKP-05**: Built-in browser renders web pages and captures content
- [x] **WKP-06**: Workspaces isolated at file-system level (~/.clawhive/workspaces/<id>/)
- [x] **WKP-07**: Agent-to-agent message protocol established in IPC layer
- [x] **WKP-08**: Cyber Workspace with hex topology visualization
- [x] **WKP-09**: Unified file system with format plugins
- [x] **WKP-10**: Message bus middleware foundation

### Security Core (Phase 3)

- [x] **SEC-01**: User can set per-task security level (high/medium/low) — `03-01`
- [x] **SEC-02**: High security tasks require approval for all actions — `03-01, 03-04`
- [x] **SEC-03**: Medium security tasks require approval for sensitive operations only — `03-01, 03-04`
- [x] **SEC-04**: Privacy guard blocks access to sensitive paths by default — `03-02`
- [x] **SEC-05**: User can define safe zones for file system access — `03-02`
- [x] **SEC-06**: Suspicious patterns (credential access, shell injection) are blocked and logged — `03-02`
- [x] **SEC-07**: All agent code execution runs in sandboxed bridge — `03-03`
- [x] **SEC-08**: Role-based permissions system controls agent capabilities — `03-01`
- [x] **SEC-09**: Tool permissions follow deny-by-default policy — `03-03`
- [x] **SEC-10**: Tool-loop circuit breakers prevent infinite execution (100 call cap) — `03-03`

### Multi-Agent Core (Phase 4)

#### Agent Registry

- [ ] **AGENT-01**: User can create agents with custom roles, responsibilities, and rich identity docs (soul.md, heartbeat.md, tools.md, agents.md)
- [ ] **AGENT-02**: User can organize agents in configurable-depth hierarchy (CEO/CFO/COO → Dept → Team → Agent)
- [ ] **AGENT-03**: 7 predefined role templates (CEO, CFO, COO, Dept Head, Team Leader, Individual Agent, Secretary) — each with explicit functions, org structure, decision-making authority, job duties
- [ ] **AGENT-04**: Agent lifecycle: persistent, ephemeral, or user-chooses-per-agent
- [ ] **AGENT-05**: Agent CRUD (create, read, update, delete, archive)
- [ ] **AGENT-06**: Agent role permissions inherit/override Phase 3 Security Core roles (SEC-08)
- [x] **AGENT-07**: Interactive org tree displays hierarchy in left pane with live status overlay (busy/idle/error)
- [ ] **AGENT-08**: Org tree supports all 3 view modes: hierarchical tree, company org chart, teams+flat-roles
- [x] **AGENT-09**: Drag-drop reparenting across all 3 org modes with cycle detection
- [x] **AGENT-10**: User can add/remove per-agent customizations: skills, knowledge docs, MCP servers, CLI tools, document references, tools
- [ ] **AGENT-11**: Secretary agent bridges top leader to user — acts as full agent in hierarchy AND system-level approval interface
- [ ] **AGENT-12**: CEO agent defined as self-improving overseer of entire company and all sub-agents
- [ ] **AGENT-13**: User can edit all 7 predefined role templates: modify soul.md, heartbeat.md, tools.md, agents.md, interaction.md
- [ ] **AGENT-14**: User can edit all agent-specific docs: soul.md, heartbeat.md, tools.md, agents.md, interaction.md
- [ ] **AGENT-15**: Agent interaction editor panel (Paperclip-style): split-pane (file list + editor with live preview), tabbed (one doc at a time), and card-based (expandable inline with full-screen modal for deep editing)

#### Task Router

- [ ] **AGENT-16**: Per-agent configurable heartbeat intervals with skip-if-busy guard (sql.js WASM constraint)
- [ ] **AGENT-17**: Parent auto-delegation routes tasks down hierarchy by default
- [ ] **AGENT-18**: User override: pick specific agent or assign task to team for collaboration
- [ ] **AGENT-19**: Workload balancing distributes tasks across sub-agents based on availability
- [ ] **AGENT-20**: Delegation chains carry originatingSecurityLevel; child execution capped at min(parentLevel, childLevel)

#### Team Manager

- [ ] **AGENT-21**: Agent isolated storage: ~/.clawhive/agents/<id>/; Team shared storage: ~/.clawhive/teams/<team-id>/
- [ ] **AGENT-22**: Hybrid shared+private memory: team has shared files/summary + each agent has private context
- [ ] **AGENT-23**: Selective conversation sharing: agents can share specific messages/threads with team peers
- [ ] **AGENT-24**: Team agents can collaborate on shared tasks with pooled context
- [ ] **AGENT-25**: Leaders monitor subagent work and correct errors/issues proactively
- [ ] **AGENT-26**: Leaders coach subagents for future improvement (feedback loops)
- [ ] **AGENT-27**: Full OKR system: leaders set goals, track key results, periodic reviews visible in leader dashboard

#### Agent Messaging

- [ ] **AGENT-28**: Direct A2A messaging: agents send structured prompts for task handoffs, discussions, suggestions
- [ ] **AGENT-29**: Leader-to-leader A2A: any leader can message any other leader across branches
- [ ] **AGENT-30**: Requests and decisions route to immediate leader (leader approval required)
- [ ] **AGENT-31**: Superior leader approval chain for escalated decisions
- [ ] **AGENT-32**: Configurable escalation paths: CEO can route to secretary or user directly depending on decision type (user configures per category)
- [ ] **AGENT-33**: Secretary agent as configurable bridge: receives top-level escalations, formats for user, relays decisions back
- [ ] **AGENT-34**: Leader message hub: full visibility into team-wide communications + per-agent message view
- [ ] **AGENT-35**: Self-improvement and coaching flows route through leadership hierarchy
- [ ] **AGENT-36**: Message bus 6-stage pipeline: validation → content filter → rate limit → routing → circuit breaker → audit
- [ ] **AGENT-37**: All A2A messages scanned by PrivacyGuard.detectSuspicious() before delivery
- [ ] **AGENT-38**: Subagent can ask parent agent when stuck or lacking knowledge — parent responds with guidance

### Advanced Features (Phase 5)

- [ ] **ADV-01**: Plan-first mode requires user approval before execution
- [ ] **ADV-02**: Agents can submit plans with checkpoints for user review
- [ ] **ADV-03**: Per-agent knowledge bases from files, folders, paths
- [ ] **ADV-04**: Obsidian vault integration for agent knowledge
- [ ] **ADV-05**: Notion workspace integration for agent knowledge
- [ ] **ADV-06**: Skills can be loaded per agent via npm installation
- [ ] **ADV-07**: MCP servers can be configured per agent
- [ ] **ADV-08**: Team leaders generate assessment reports of sub-agent work
- [ ] **ADV-09**: Reports aggregate up hierarchy (Team → Dept → CEO)
- [ ] **ADV-10**: CEO agent reviews all team assessment reports
- [ ] **ADV-11**: Recurring/scheduled tasks with team/agent selection
- [ ] **ADV-12**: Browser control via built-in Playwright/Puppeteer integration

### Polish & Distribution (Phase 6)

- [ ] **POL-01**: Bilingual UI supports English and Chinese
- [ ] **POL-02**: Auto-update checks monthly and prompts user (not automatic)
- [ ] **POL-03**: macOS TCC permissions handled gracefully (prompt, not crash)
- [ ] **POL-04**: First-launch wizard for agent creation and config import
- [ ] **POL-05**: Import from existing OpenClaw/Claude Code configuration
- [ ] **POL-06**: Performance optimized for multi-agent workloads
- [ ] **POL-07**: DMG distribution with code signing and notarization
- [ ] **POL-08**: Custom provider support with base URL configuration
- [ ] **POL-09**: Auto-fetch model lists from custom providers

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Messaging Integrations

- **MSG-01**: WhatsApp integration for agent messaging
- **MSG-02**: Telegram integration for agent messaging
- **MSG-03**: Slack integration for team notifications
- **MSG-04**: iMessage integration for macOS native messaging

### Office Suite

- **OFF-01**: Google Workspace integration (docs, sheets, slides, gmail)
- **OFF-02**: Microsoft Office integration (documents, outlook)
- **OFF-03**: Feishu document creation

### Platform Expansion

- **PLAT-01**: Windows native port
- **PLAT-02**: Linux native port
- **PLAT-03**: Mobile companion app (iOS/Android)

### Cloud Features

- **CLD-01**: Cloud sync for cross-device access (explicitly excluded for v1)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud sync | Privacy-first, bank-level security promise, no data exposure risk |
| Silent auto-updates | User should control when updates apply |
| Real-time multi-user collaboration | Personal assistant scope, single-user with multi-agent delegation |
| Flat agent structure | Doesn't scale, unclear responsibility lines |
| Auto-allow sensitive operations | Security risk, violates bank-level promise |
| Document auto-organization | Scope creep, defer to v2+ |
| PDF generation in dialog | Not core value, use browser control instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Pending |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Pending |
| FND-09 | Phase 1 | Complete |
| FND-10 | Phase 1 | Complete |
| WKP-01 | Phase 2 | Complete |
| WKP-02 | Phase 2 | Complete |
| WKP-03 | Phase 2 | Complete |
| WKP-04 | Phase 2 | Complete |
| WKP-05 | Phase 2 | Complete |
| WKP-06 | Phase 2 | Complete |
| WKP-07 | Phase 2 | Complete |
| WKP-08 | Phase 2 | Complete |
| WKP-09 | Phase 2 | Complete |
| WKP-10 | Phase 2 | Complete |
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |
| SEC-04 | Phase 3 | Complete |
| SEC-05 | Phase 3 | Complete |
| SEC-06 | Phase 3 | Complete |
| SEC-07 | Phase 3 | Complete |
| SEC-08 | Phase 3 | Complete |
| SEC-09 | Phase 3 | Complete |
| SEC-10 | Phase 3 | Complete |
| AGENT-01 | Phase 4.01 + 4.02 | Pending |
| AGENT-02 | Phase 4.02 | Pending |
| AGENT-03 | Phase 4.01 | Pending |
| AGENT-04 | Phase 4.01 | Pending |
| AGENT-05 | Phase 4.01 | Pending |
| AGENT-06 | Phase 4.01 | Pending |
| AGENT-07 | Phase 4.02 | Complete |
| AGENT-08 | Phase 4.02 | Pending |
| AGENT-09 | Phase 4.02 | Complete |
| AGENT-10 | Phase 4.02 | Complete |
| AGENT-11 | Phase 4.02 | Pending |
| AGENT-12 | Phase 4.02 | Pending |
| AGENT-13 | Phase 4.02 | Pending |
| AGENT-14 | Phase 4.02 | Pending |
| AGENT-15 | Phase 4.02 | Pending |
| AGENT-16 | Phase 4.03 | Pending |
| AGENT-17 | Phase 4.03 | Pending |
| AGENT-18 | Phase 4.03 | Pending |
| AGENT-19 | Phase 4.03 | Pending |
| AGENT-20 | Phase 4.03 | Pending |
| AGENT-21 | Phase 4.01 + 4.04 | Pending |
| AGENT-22 | Phase 4.04 | Pending |
| AGENT-23 | Phase 4.04 | Pending |
| AGENT-24 | Phase 4.04 | Pending |
| AGENT-25 | Phase 4.04 | Pending |
| AGENT-26 | Phase 4.04 | Pending |
| AGENT-27 | Phase 4.04 | Pending |
| AGENT-28 | Phase 4.05 | Pending |
| AGENT-29 | Phase 4.05 | Pending |
| AGENT-30 | Phase 4.06 | Pending |
| AGENT-31 | Phase 4.06 | Pending |
| AGENT-32 | Phase 4.06 | Pending |
| AGENT-33 | Phase 4.06 | Pending |
| AGENT-34 | Phase 4.06 | Pending |
| AGENT-35 | Phase 4.07 | Pending |
| AGENT-36 | Phase 4.05 + 4.07 | Pending |
| AGENT-37 | Phase 4.07 | Pending |
| AGENT-38 | Phase 4.07 | Pending |
| ADV-01 | Phase 5 | Pending |
| ADV-02 | Phase 5 | Pending |
| ADV-03 | Phase 5 | Pending |
| ADV-04 | Phase 5 | Pending |
| ADV-05 | Phase 5 | Pending |
| ADV-06 | Phase 5 | Pending |
| ADV-07 | Phase 5 | Pending |
| ADV-08 | Phase 5 | Pending |
| ADV-09 | Phase 5 | Pending |
| ADV-10 | Phase 5 | Pending |
| ADV-11 | Phase 5 | Pending |
| ADV-12 | Phase 5 | Pending |
| POL-01 | Phase 6 | Pending |
| POL-02 | Phase 6 | Pending |
| POL-03 | Phase 6 | Pending |
| POL-04 | Phase 6 | Pending |
| POL-05 | Phase 6 | Pending |
| POL-06 | Phase 6 | Pending |
| POL-07 | Phase 6 | Pending |
| POL-08 | Phase 6 | Pending |
| POL-09 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 89 total (28 complete, 61 pending)
- Phase 4 requirements: 38 (0 complete, 38 pending across 7 sub-plans)
- Mapped to phases: 89
- Unmapped: 0

**Phase 4 Requirement Distribution:**

| Plan | Requirements | Count |
|------|-------------|-------|
| 04-01 | AGENT-01(partial), AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-21(partial) | 6 |
| 04-02 | AGENT-01(partial), AGENT-02, AGENT-07 to AGENT-15 | 11 |
| 04-03 | AGENT-16 to AGENT-20 | 5 |
| 04-04 | AGENT-21(partial), AGENT-22 to AGENT-27 | 7 |
| 04-05 | AGENT-28, AGENT-29, AGENT-36(partial) | 3 |
| 04-06 | AGENT-30 to AGENT-34 | 5 |
| 04-07 | AGENT-35, AGENT-36(partial), AGENT-37, AGENT-38 | 4 |

---

*Requirements defined: 2026-03-28*
*Last updated: 2026-03-31 — Phase 4 expanded to 7 sub-plans (04-01 through 04-07)*
