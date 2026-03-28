# ClawHive

## What This Is

ClawHive is a personal AI assistant for macOS with a hierarchical multi-agent system and bank-level security. It features an interactive Electron-based GUI where users can create, manage, and orchestrate teams of AI agents that collaborate on tasks. Agents exist in a company-like hierarchy (CEO/CFO/COO → Department Heads → Team Leaders → Individual Agents) with each level having different permissions and responsibilities.

## Core Value

Users can safely delegate complex tasks to autonomous agent teams while maintaining complete control over system access, privacy, and security — combining the productivity of multi-agent AI with bank-level security that blocks unauthorized data access.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-agent hierarchical system: user-defined + dynamic roles (CEO, CFO, COO, managers, team leaders, sub-agents)
- [ ] Agent communication: top-down flow + team-level collaboration (shared files/memories, selective conversation sharing)
- [ ] Security: per-task security levels, sandboxed bridge, role-based permissions, prompt approval for risky actions
- [ ] Privacy guard: block sensitive paths first, ask permission, user-defined safe zones
- [ ] Suspicious pattern detection: block + alert + log
- [ ] Electron-based GUI with dual-pane design (left: org tree, right: chat/swarm/progress views)
- [ ] Chat input with model selection, multi-file/image upload, ambient glow during work
- [ ] Multi-provider support: Anthropic, OpenAI, Grok, MiniMax, Kimi, GLM, Ollama (local+cloud), GitHub Copilot, custom base URL
- [ ] Auto-fetch model lists from custom providers
- [ ] Knowledge bases per agent (files, folders, paths, Obsidian, Notion)
- [ ] Skills and MCP loading per agent
- [ ] NPM skill installation per agent
- [ ] Auto-update: monthly check + prompt user (not automatic)
- [ ] Local data storage with custom path selection (portable install support)
- [ ] Bilingual UI: English and Chinese
- [ ] Dark/light mode toggle
- [ ] Browser control: built-in (Playwright/Puppeteer) + extension + MCP
- [ ] Task assignment: single agent, multiple agents, or team collaboration
- [ ] Plan-first mode: agents submit plans before execution (user approval required)
- [ ] Recurring/scheduled tasks with team/agent selection
- [ ] Assessment reports: team leaders review work, parents aggregate, CEO reviews all

### Out of Scope

- Google Workspace integration (v2: docs, sheets, slides, gmail)
- Microsoft Office integration (v2: documents, outlook)
- Feishu document creation
- QQ, WhatsApp, Telegram, iMessage, Slack for management (v2+)
- Document auto-organization on computer (v2+)
- PDF generation in dialog
- Windows/Linux ports (future consideration)
- Cloud sync (intentionally excluded for privacy)
- Mobile companion app (future consideration)

## Context

Built on OpenClaw SDK as a library — leveraging OpenClaw's agent framework, skills system, MCP support, and peer communication. Replaces OpenClaw's gateway/channel layer with custom multi-agent orchestration.

Target users: both power users (full control) and general consumers (simplified defaults). First launch: agent creation wizard + import from existing OpenClaw/Claude Code config.

## Constraints

- **Tech Stack:** Electron (Node.js + web UI), TypeScript, OpenClaw SDK as library, Swift wrapper if needed for macOS-specific features
- **Security:** Never auto-allow sensitive access; always block + ask; local-only data (no cloud sync)
- **Platform:** macOS 13+ primary; architecture allows future Windows/Linux ports
- **Distribution:** .dmg format, portable install (any location including external drives)
- **Languages:** English, Chinese (i18n ready for future expansion)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use OpenClaw SDK as library | Leverage proven agent/skill/MCP infrastructure while building custom hierarchy on top | — Pending |
| Electron over Tauri | Larger ecosystem, easier npm compatibility, familiar to OpenClaw's Node.js foundation | — Pending |
| Local-only data (no cloud) | Privacy-first, bank-level security promise, no data exposure risk | — Pending |
| Hierarchical agent model (not flat) | Better task delegation, clear responsibility lines, scalable for complex workflows | — Pending |
| Team-level collaboration (not pure hierarchy) | Allows sub-agents to work together with shared context while maintaining reporting structure | — Pending |
| Per-task security levels | Different tasks have different risk profiles; user should choose appropriate safety level | — Pending |

---
*Last updated: 2026-03-28 after deep questioning phase*
