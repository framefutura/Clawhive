---
phase: 01
slug: foundation
status: approved
updated: 2026-03-29
---

# Phase 01-foundation — DeskClaw Integration Update

**Update Reason:** Integrate DeskClaw (Ndeskcrawl) core concepts — Cyber Workspace and Gene System — to simplify the Paperclip-complex dashboard into a more focused central command center.

## DeskClaw Core Concepts for ClawHive

### 1. 赛博办公室 (Cyber Workspace)

**Concept:** A hexagonal topology digital space where humans and AI co-manage operations.

**For ClawHive Phase 1 (Simplified):**
- **Central Dashboard** replaces complex Paperclip layout
- **Single Office View** — one workspace per agent team (Phase 1: single team)
- **Blackboard (黑板)** — shared team dashboard showing:
  - Active tasks/operations
  - Agent status and activity
  - Recent messages/updates
  - Quick actions
- **Focus on simplicity** — not a monitoring panel, but where work happens

**UI Elements:**
- Clean, uncluttered main view
- Left sidebar: Team/agent list (simplified from Paperclip)
- Center: Blackboard with key information cards
- Right panel: Chat/command input (collapsible)
- Top bar: Model selector, theme toggle, settings

### 2. 基因系统 (Gene System)

**Concept:** Modular capability investment — loading "genes" (skills) into AI agents.

**For ClawHive Phase 1 (Foundation):**
- **Gene = Skill/Tool** — each gene gives the agent a capability
- **Gene Categories:** 开发, 数据, 运维, 网络, 创意, 沟通, 安全, 效率
- **Simple gene loader** in agent creation/editing
- **Foundation for marketplace** — UI supports future public/private gene market

**Phase 1 Implementation:**
- Basic gene selection during agent setup
- Store selected genes in agent config
- UI shows active genes as badges/tags
- Foundation for gene activation/deactivation

### 3. Simplified Layout (vs Paperclip)

| Aspect | Paperclip | DeskClaw-Inspired ClawHive |
|--------|-----------|---------------------------|
| Layout | 3-zone complex (sidebar + main + properties) | 2-zone clean (sidebar + blackboard) |
| Navigation | Many pages (Issues, Goals, Costs, etc.) | Single office view with contextual panels |
| Info Density | High (dense tables, many metrics) | Moderate (cards, focus on current work) |
| Agent Display | Org tree + status list | Hex topology visualization (simplified for desktop) |
| Skills | Plugin system | Gene system with categories |

## Updated Implementation Decisions

### Main View Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ClawHive    [Model ▾]                           🌙 ⚙️     │  ← Top bar
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌────────────────────────────────────────────┐  │
│  Team    │  │  📋 Blackboard                              │  │
│  ─────── │  │  ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  👤 AI   │  │  │ Task 1 │ │ Task 2 │ │ Status │         │  │
│  👤 AI   │  │  └────────┘ └────────┘ └────────┘         │  │
│  👤 AI   │  │                                             │  │
│          │  │  💬 Recent Activity                         │  │
│  Genes   │  │  • Agent A completed X...                   │  │
│  ─────── │  │  • Agent B started Y...                     │  │
│  🔧 Dev  │  │                                             │  │
│  🔧 Data │  └────────────────────────────────────────────┘  │
│          │                                                  │
│  [+New]  │  ┌────────────────────────────────────────────┐  │
│          │  │  💬 Chat / Command Input                    │  │
│          │  │  Type message...              [Send]       │  │
│          │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

### Blackboard Cards

Each card on the blackboard shows:
- **Title** — clear, concise
- **Status indicator** — color-coded (idle, working, completed, error)
- **Key metric** — one number or status
- **Action button** — primary action for this item

Example cards:
- Current Task: "Writing API docs" + progress + [View]
- Agent Status: 3 active, 1 idle + [Manage]
- Recent Messages: Last 3 messages + [Open Chat]

### Gene System UI

**Agent Creation Wizard:**
1. Name & Role
2. Model Provider
3. **Load Genes** — multi-select by category:
   - Development: code-writing, debugging, review
   - Data: analysis, SQL, visualization
   - Ops: deployment, monitoring, troubleshooting
   - Network: API testing, security scanning
   - Creative: content writing, design suggestions
   - Communication: summarization, translation
   - Security: audit, vulnerability detection
   - Efficiency: automation, scripting

**Gene Display:**
- Active genes shown as colored badges on agent card
- Click to view gene details
- Future: Gene marketplace integration

## Technical Integration

### Phase 1 Scope Adjustment

**Original:** Complex Paperclip-style dashboard
**Updated:** Simplified DeskClaw-inspired office view

**What Changes:**
1. `01-03-PLAN.md` — Replace complex UI with blackboard-focused layout
2. `01-02-PLAN.md` — Add gene system foundation to agent/session types
3. `01-UI-SPEC.md` — Update layout specs, add gene category colors

**What Stays:**
- Secure Electron shell
- OpenClaw SDK integration
- Encrypted SQLite storage
- Model provider switching
- File upload
- Theme toggle

## Files to Update

1. `.planning/phases/01-foundation/01-UI-SPEC.md` — Update layout and add gene system colors
2. `.planning/phases/01-foundation/01-02-PLAN.md` — Add gene types and agent gene loading
3. `.planning/phases/01-foundation/01-03-PLAN.md` — Simplify UI, add blackboard component, gene picker

## Validation

After updates:
- [ ] UI-SPEC reflects simplified blackboard layout
- [ ] Gene system categories defined
- [ ] Plans updated with new components
- [ ] No loss of original Phase 1 requirements coverage

---

*DeskClaw research from: /Volumes/S/Projects/nodeskclaw*
*Key concepts: Cyber Workspace, Gene System, Hexagonal topology (simplified)*
