# Roadmap: ClawHive

## Overview

ClawHive evolves from a basic Electron shell with single-agent chat to a full hierarchical multi-agent system with bank-level security. The journey establishes security foundations first, then builds the multi-agent hierarchy, adds advanced features, and finally polishes for distribution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Secure Electron shell, OpenClaw SDK integration, basic chat
- [x] **Phase 2: Security Core** - Per-task security levels, privacy guard, sandboxed execution
- [x] **Phase 3: Multi-Agent Core** - Hierarchical agents, task routing, team collaboration
- [x] **Phase 4: Advanced Features** - Plan-first mode, knowledge bases, browser control
- [x] **Phase 5: Polish & Distribution** - i18n, auto-update, DMG packaging

## Phase Details

### Phase 1: Foundation
**Goal**: Establish secure Electron shell with OpenClaw SDK integration and basic single-agent chat functionality
**Depends on**: Nothing (first phase)
**Requirements**: FND-01 through FND-10
**Success Criteria** (what must be TRUE):
  1. User can install app via DMG to custom location and launch successfully
  2. User can have a conversation with a single AI agent through chat interface
  3. Chat history persists in local encrypted SQLite database
  4. Multiple model providers (Anthropic, OpenAI, Ollama) work correctly
  5. Dark/light mode toggle works with system-aware default
**Plans**: 4 plans

Plans:
- [ ] 01-01: Project scaffolding — pnpm workspace, TypeScript config, Vite setup, Electron main process
- [ ] 01-02: OpenClaw SDK integration — Agent runtime, skill loader, session manager, IPC bridge
- [ ] 01-03: Core UI — React app with chat interface, model selector, file upload, dark/light mode
- [ ] 01-04: Local storage — SQLite setup, encryption, session persistence, config management

### Phase 2: Security Core
**Goal**: Build security infrastructure with per-task security levels, privacy guard, and sandboxed execution before multi-agent features
**Depends on**: Phase 1
**Requirements**: SEC-01 through SEC-10
**Success Criteria** (what must be TRUE):
  1. User can select security level (high/medium/low) when starting a task
  2. High security tasks prompt for approval on all actions
  3. Privacy guard blocks sensitive paths and allows user-defined safe zones
  4. Suspicious patterns (credential access, shell injection) are detected and blocked
  5. Tool permissions follow deny-by-default policy
**Plans**: 3 plans

Plans:
- [ ] 02-01: Security Manager — Per-task security levels, approval workflows, role-based permissions
- [ ] 02-02: Privacy Guard — Path blocking, safe zones, suspicious pattern detection, audit logging
- [ ] 02-03: Sandboxed Bridge — Isolated code execution, tool permission system, deny-by-default policy

### Phase 3: Multi-Agent Core
**Goal**: Implement hierarchical multi-agent system with CEO-to-agent structure, task routing, and team collaboration
**Depends on**: Phase 2
**Requirements**: AGENT-01 through AGENT-12
**Success Criteria** (what must be TRUE):
  1. User can create agents with roles (CEO, CFO, COO, Department Head, Team Leader, Individual Agent)
  2. Tasks route through hierarchy (CEO delegates to Dept → Team → Agent)
  3. Agents in same team can collaborate with shared memory and selective conversation sharing
  4. Organization tree displays hierarchy visually in left pane
  5. Task assignment works for single agent, multiple agents, or team collaboration
**Plans**: 4 plans

Plans:
- [ ] 03-01: Agent Registry — Agent CRUD, role assignment, hierarchy management, organization tree UI
- [ ] 03-02: Task Router — Hierarchy-based routing, workload balancing, delegation flow (CEO → Dept → Team → Agent)
- [ ] 03-03: Team Manager — Team collaboration, shared memory, selective conversation sharing, team workspaces
- [ ] 03-04: Multi-Agent UI — Swarm view, progress tracking, agent status, team views

### Phase 4: Advanced Features
**Goal**: Add differentiating features — plan-first mode, knowledge bases, browser control, scheduled tasks, and assessment reports
**Depends on**: Phase 3
**Requirements**: ADV-01 through ADV-12
**Success Criteria** (what must be TRUE):
  1. Plan-first mode requires agent to submit plan before execution with user approval
  2. Agents can use knowledge bases from files, folders, Obsidian, and Notion
  3. Skills can be installed per agent via npm
  4. MCP servers can be configured per agent
  5. Team leaders generate assessment reports that aggregate up hierarchy
**Plans**: 4 plans

Plans:
- [ ] 04-01: Plan Engine — Plan-first mode, user approval checkpoints, plan visualization
- [ ] 04-02: Knowledge Base — File/folder indexing, Obsidian vault, Notion workspace integration
- [ ] 04-03: Skills & MCP — NPM skill installation, MCP server configuration, tool marketplace
- [ ] 04-04: Reports & Scheduling — Assessment reports, recurring tasks, browser control integration

### Phase 5: Polish & Distribution
**Goal**: Final UX polish, internationalization, and distribution mechanism for production release
**Depends on**: Phase 4
**Requirements**: POL-01 through POL-09
**Success Criteria** (what must be TRUE):
  1. UI supports English and Chinese with complete translation
  2. Auto-update checks monthly and prompts user (no silent updates)
  3. macOS TCC permissions handled gracefully without crashes
  4. First-launch wizard guides agent creation and config import
  5. DMG distribution works with code signing and notarization
**Plans**: 3 plans

Plans:
- [ ] 05-01: Internationalization — i18n setup, English/Chinese translations, language toggle
- [ ] 05-02: Distribution — Auto-update system, DMG packaging, code signing, notarization
- [ ] 05-03: Polish — First-launch wizard, config import, macOS TCC handling, performance optimization

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | 1/4 | In Progress|  | - |
| 2. Security Core | v1.0 | 0/3 | Not started | - |
| 3. Multi-Agent Core | v1.0 | 0/4 | Not started | - |
| 4. Advanced Features | v1.0 | 0/4 | Not started | - |
| 5. Polish & Distribution | v1.0 | 0/3 | Not started | - |

---
*Roadmap created: 2026-03-28*
*Based on research synthesis from .planning/research/SUMMARY.md*
