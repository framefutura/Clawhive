# Requirements: ClawHive

**Defined:** 2026-03-28
**Core Value:** Users can safely delegate complex tasks to autonomous agent teams while maintaining complete control over system access, privacy, and security

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation (Phase 1)

- [x] **FND-01**: User can install app via DMG to any location (portable install)
- [x] **FND-02**: App launches with secure Electron shell (contextIsolation, sandbox enabled)
- [ ] **FND-03**: User can select custom data storage path on first launch
- [x] **FND-04**: User can chat with a single AI agent through React-based chat interface
- [x] **FND-05**: User can select model from multiple providers (Anthropic, OpenAI, Ollama)
- [ ] **FND-06**: User can upload files and images to chat (drag-drop, clipboard, file picker)
- [ ] **FND-07**: Chat history persists locally in encrypted SQLite database
- [ ] **FND-08**: User can toggle between dark and light mode (system-aware default)
- [x] **FND-09**: App displays ambient visual feedback (glow/pulse) during agent work
- [x] **FND-10**: IPC bridge established between Electron main process and renderer

### Security Core (Phase 2)

- [ ] **SEC-01**: User can set per-task security level (high/medium/low)
- [ ] **SEC-02**: High security tasks require approval for all actions
- [ ] **SEC-03**: Medium security tasks require approval for sensitive operations only
- [ ] **SEC-04**: Privacy guard blocks access to sensitive paths by default
- [ ] **SEC-05**: User can define safe zones for file system access
- [ ] **SEC-06**: Suspicious patterns (credential access, shell injection) are blocked and logged
- [ ] **SEC-07**: All agent code execution runs in sandboxed bridge
- [ ] **SEC-08**: Role-based permissions system controls agent capabilities
- [ ] **SEC-09**: Tool permissions follow deny-by-default policy
- [ ] **SEC-10**: Tool-loop circuit breakers prevent infinite execution (100 call cap)

### Multi-Agent Core (Phase 3)

- [ ] **AGENT-01**: User can create agents with custom roles and responsibilities
- [ ] **AGENT-02**: User can organize agents in hierarchy (CEO/CFO/COO → Dept → Team → Agent)
- [ ] **AGENT-03**: Agents can delegate tasks down the hierarchy
- [ ] **AGENT-04**: Team-level agents share memory and files
- [ ] **AGENT-05**: Sub-agents can collaborate with selective conversation sharing
- [ ] **AGENT-06**: Each agent has isolated session storage (~/.clawhive/agents/<id>/)
- [ ] **AGENT-07**: Agent registry supports CRUD operations for agent management
- [ ] **AGENT-08**: Task router assigns tasks based on role and workload
- [ ] **AGENT-09**: Users can assign tasks to single agent, multiple agents, or team
- [ ] **AGENT-10**: Visual org tree displays hierarchy structure in left pane
- [ ] **AGENT-11**: Swarm view shows real-time team collaboration status
- [ ] **AGENT-12**: Progress view tracks task completion across agents

### Advanced Features (Phase 4)

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

### Polish & Distribution (Phase 5)

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
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Pending |
| FND-07 | Phase 1 | Pending |
| FND-08 | Phase 1 | Pending |
| FND-09 | Phase 1 | Complete |
| FND-10 | Phase 1 | Complete |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 2 | Pending |
| SEC-06 | Phase 2 | Pending |
| SEC-07 | Phase 2 | Pending |
| SEC-08 | Phase 2 | Pending |
| SEC-09 | Phase 2 | Pending |
| SEC-10 | Phase 2 | Pending |
| AGENT-01 | Phase 3 | Pending |
| AGENT-02 | Phase 3 | Pending |
| AGENT-03 | Phase 3 | Pending |
| AGENT-04 | Phase 3 | Pending |
| AGENT-05 | Phase 3 | Pending |
| AGENT-06 | Phase 3 | Pending |
| AGENT-07 | Phase 3 | Pending |
| AGENT-08 | Phase 3 | Pending |
| AGENT-09 | Phase 3 | Pending |
| AGENT-10 | Phase 3 | Pending |
| AGENT-11 | Phase 3 | Pending |
| AGENT-12 | Phase 3 | Pending |
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| ADV-03 | Phase 4 | Pending |
| ADV-04 | Phase 4 | Pending |
| ADV-05 | Phase 4 | Pending |
| ADV-06 | Phase 4 | Pending |
| ADV-07 | Phase 4 | Pending |
| ADV-08 | Phase 4 | Pending |
| ADV-09 | Phase 4 | Pending |
| ADV-10 | Phase 4 | Pending |
| ADV-11 | Phase 4 | Pending |
| ADV-12 | Phase 4 | Pending |
| POL-01 | Phase 5 | Pending |
| POL-02 | Phase 5 | Pending |
| POL-03 | Phase 5 | Pending |
| POL-04 | Phase 5 | Pending |
| POL-05 | Phase 5 | Pending |
| POL-06 | Phase 5 | Pending |
| POL-07 | Phase 5 | Pending |
| POL-08 | Phase 5 | Pending |
| POL-09 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after research synthesis*
