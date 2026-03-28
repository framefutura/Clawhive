# Project Research Summary

**Project:** ClawHive
**Domain:** Desktop Multi-Agent AI Assistant
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

ClawHive is a hierarchical multi-agent AI assistant with an Electron GUI, building on OpenClaw's proven agent runtime. The product differentiates through three core pillars: (1) a CEO-to-agent hierarchy for scalable delegation, (2) bank-level security with per-task security levels and sandboxed execution, and (3) a native desktop experience with visual feedback and team collaboration views.

The recommended approach is a layered architecture: Electron frontend with React/Zustand, a main-process orchestration core (Agent Registry, Task Router, Team Manager, Security Manager), and OpenClaw SDK integration for agent runtime. This leverages OpenClaw's mature agent infrastructure while adding ClawHive-specific hierarchy and security layers.

Key risks include insufficient process isolation between agents (must design renderer-per-agent from day one), LLM-based security decisions (enforce deterministic code-only policies), and Electron security misconfiguration (contextIsolation, sandbox, and CSP are non-negotiable). The phase structure below addresses these risks by building security foundations before adding complex multi-agent features.

## Key Findings

### Recommended Stack

The technology stack balances proven patterns from OpenClaw with Electron-specific requirements. Core choices: Node 22 + TypeScript 5.x for strong typing, Electron 33+ for desktop with strict security defaults, React 18 with Zustand for UI state management, and better-sqlite3 for local encrypted storage.

**Core technologies:**
- **Electron 33+:** Desktop framework with contextIsolation, sandbox, and security patches
- **React 18 + Zustand:** UI framework with lightweight state management for agent tracking
- **OpenClaw SDK:** Agent runtime, skills system, MCP registry, and session management
- **better-sqlite3 11:** Zero-config local database with encryption at rest
- **pnpm 9:** Workspace support matching OpenClaw's package manager

**Supporting libraries:** Tailwind CSS + shadcn/ui for styling, @anthropic-ai/sdk and openai for model providers, vitest + Playwright for testing.

### Expected Features

**Must have (table stakes):**
- Multi-provider LLM support (Anthropic, OpenAI, Ollama/local) — lock-in is unacceptable
- Chat interface with persistent, searchable history
- File attachment/upload with drag-drop and clipboard support
- Tool use / Function calling via MCP protocol
- Dark/light mode with system-aware default
- Local data storage with custom path option

**Should have (differentiators):**
- Hierarchical agent structure (CEO → Dept Heads → Team Leaders → Agents) — ClawHive's core differentiator
- Per-task security levels with bank-level security positioning
- Plan-first execution mode for trust-building autonomous actions
- Team collaboration with shared memory and selective conversation sharing
- Knowledge base integration per agent (files, Notion, Obsidian)
- Browser control via Playwright integration

**Defer (v2+):**
- Messaging integrations (WhatsApp, Telegram, Slack) — scope creep and security surface
- Office suite native integration — use browser control instead
- Mobile companion app and Windows/Linux ports — validate macOS first
- Cloud sync — intentionally excluded for privacy-first positioning

### Architecture Approach

A five-layer architecture: (1) Presentation Layer (Electron GUI with org tree, chat, swarm view), (2) Orchestration Layer (Agent Registry, Task Router, Team Manager, Plan Engine), (3) Agent Runtime Layer (OpenClaw SDK integration), (4) Security Layer (Security Manager, Privacy Guard, sandboxed bridge), and (5) Infrastructure Layer (SQLite, knowledge base, model providers).

**Major components:**
1. **Agent Registry** — CRUD for agents, role assignment, hierarchy management
2. **Task Router** — Route tasks based on hierarchy and workload, CEO → Dept → Team → Agent flow
3. **Security Manager** — Per-task security levels, role-based permissions, approval workflows
4. **Team Manager** — Team-level collaboration, shared workspaces, selective context sharing
5. **Plan Engine** — Plan-first mode with user approval at checkpoints
6. **Privacy Guard** — Path blocking, safe zones, suspicious pattern detection

### Critical Pitfalls

1. **Insufficient Process Isolation Between Agents** — Design renderer-per-agent architecture from day one with contextIsolation: true, separate storage roots (~/.clawhive/agents/<id>/), and credential vault per agent. Cannot retrofit without major rewrite.

2. **Trusting the LLM with Security Decisions** — Enforce deterministic policy enforcement in code, never in prompts. Use allowlist/blocklist architecture (tools.allow/tools.deny), pre-LLM filtering, and post-LLM validation.

3. **Electron Security Misconfiguration** — Always enable contextIsolation, disable nodeIntegration, apply strict CSP, sandbox all renderers, and validate all IPC messages. Set security defaults at project creation.

4. **Missing Tool-Loop Circuit Breakers** — Hard cap on tool calls per session (100 max), loop detection for repetitive patterns, delegation cycle detection across agents, and user-visible timeout with pause-and-ask.

5. **Over-Privileged Default Tool Access** — Deny-by-default for new agents, explicit escalation for dangerous tools, tool profiles for safe presets, and visual danger indicators in UI.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Establish secure Electron shell, OpenClaw SDK integration, and IPC bridge before adding complexity. Security defaults must be set at creation.
**Delivers:** Working Electron app with basic chat, single agent execution, local storage, secure IPC
**Addresses:** Multi-provider LLM support, chat interface, file upload, local storage, dark mode
**Avoids:** Electron security misconfiguration, process isolation issues

### Phase 2: Security Core
**Rationale:** Security infrastructure must exist before multi-agent features. Per-task security and approval gates are foundational.
**Delivers:** Security Manager, Privacy Guard, approval gates, sandboxed code execution, tool permissions system
**Uses:** Electron sandbox, OpenClaw tools.allow/tools.deny patterns
**Implements:** Security Manager, Privacy Guard components
**Avoids:** Over-privileged tool access, LLM-based security decisions, missing approval gates

### Phase 3: Multi-Agent Core
**Rationale:** With security in place, build hierarchy and delegation. This is ClawHive's core differentiator.
**Delivers:** Agent Registry, Task Router, hierarchical agent structure, top-down delegation, team collaboration, session isolation
**Uses:** OpenClaw Agent Runtime, Session Manager
**Implements:** Agent Registry, Task Router, Team Manager components
**Avoids:** Insufficient session isolation, context over-sharing

### Phase 4: Advanced Features
**Rationale:** Polish differentiators after core multi-agent system is stable.
**Delivers:** Plan-first mode, knowledge base integration, assessment reports, scheduled tasks, browser control
**Uses:** OpenClaw MCP Registry, Plan Engine patterns
**Implements:** Plan Engine, Report Generator, Schedule Engine components
**Avoids:** No plan-before-execute mode, poor long-running task handling

### Phase 5: Polish & Distribution
**Rationale:** Final UX polish, internationalization, and distribution mechanism.
**Delivers:** i18n (English + Chinese), auto-update, performance optimization, macOS TCC handling, electron-builder packaging
**Avoids:** Broken macOS TCC/permission handling, configuration sprawl

### Phase Ordering Rationale

- **Foundation first** because security defaults cannot be retrofitted and all subsequent features depend on Electron shell and OpenClaw integration
- **Security before multi-agent** because hierarchical agents with different trust levels require isolation and permission infrastructure
- **Multi-agent before advanced features** because plan-first, knowledge bases, and browser control are meaningless without agents to use them
- **Polish last** because UX refinements and distribution require stable core functionality

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Multi-agent coordination patterns — complex integration with limited prior art for hierarchical agent systems
- **Phase 4:** Knowledge base integration — RAG pipeline and Notion/Obsidian connectors need API research

Phases with standard patterns (skip research-phase):
- **Phase 1:** Electron + React + IPC patterns are well-documented
- **Phase 2:** OpenClaw's security patterns (tools.allow/deny, exec-approvals) are proven

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on OpenClaw production experience and Electron best practices |
| Features | MEDIUM | Competitive analysis based on training data; verify current landscape |
| Architecture | MEDIUM-HIGH | OpenClaw SDK patterns validated; hierarchy layer is novel |
| Pitfalls | HIGH | Based on OpenClaw production experience and Electron security guidelines |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Current competitive analysis:** Verify Claude Code, Cursor, Windsurf features as of 2026 before finalizing differentiators
- **User research:** Validate which differentiators (hierarchy vs. security vs. collaboration) matter most to target users
- **MCP ecosystem status:** Verify which MCP servers are production-ready for knowledge base and browser control integrations
- **Performance benchmarks:** Multi-agent overhead vs single-agent performance needs measurement during Phase 3

## Sources

### Primary (HIGH confidence)
- OpenClaw codebase analysis — agent framework (`src/plugin-sdk/agent-runtime.ts`), skills system, MCP patterns (`src/acp/control-plane/`)
- Electron security best practices — contextIsolation, sandboxing, CSP guidelines
- Project requirements (`.planning/PROJECT.md`) — ClawHive scope and anti-features

### Secondary (MEDIUM confidence)
- OpenClaw macOS app architecture (`apps/macos/Sources/OpenClaw/`) — desktop patterns
- React ecosystem documentation — Zustand, Tailwind, shadcn/ui patterns
- Training data on 2025 desktop AI assistant landscape — competitive positioning

### Tertiary (LOW confidence)
- Current competitive product features — needs verification with 2026 product documentation
- User preference data for differentiators — needs user research validation

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
