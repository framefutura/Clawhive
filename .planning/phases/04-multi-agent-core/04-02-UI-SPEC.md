---
phase: 04-02
slug: agent-registry-ui
status: draft
shadcn_initialized: true
preset: none
created: 2026-04-02
---

# Phase 04-02 — UI Design Contract

> Visual and interaction contract for Agent Registry UI. Generated inline (researcher agent timeout), verified by gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | not applicable (existing project) |
| Component library | Radix UI primitives |
| Icon library | Lucide React |
| Font | Manrope (sans), JetBrains Mono (mono) |

---

## Spacing Scale

Declared values (multiples of 4 only):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding, status dot margins |
| sm | 8px | Compact element spacing, tree node padding, progress bar height |
| md | 16px | Default element spacing, card padding, agent node vertical spacing |
| lg | 24px | Section padding, panel gaps |
| xl | 32px | Layout gaps, major section breaks |
| 2xl | 48px | Page-level spacing, pane margins |
| 3xl | 64px | Full-screen modal padding |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.4 |
| Heading | 18px | 600 | 1.3 |
| Display | 24px | 600 | 1.2 |

Weights allowed: 400 (regular), 600 (semibold) only.

Hierarchy-specific usages (use Body/Label/Heading sizes only):
- Agent name in tree: Body size (14px), weight 400
- Role badge text: Label size (12px), weight 600, uppercase, letter-spacing 0.5px
- Status label: Label size (12px), weight 400
- Doc editor heading: Heading size (18px), weight 600
- Mono (code/docs): Body size (14px), weight 400

---

## Color

### Base Palette (from existing shadcn-variables.css)

| Role | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| Dominant (60%) | #FAFAFA (bg) | #0D0D0D (bg) | Background, surfaces |
| Secondary (30%) | #FFFFFF (card) | #1A1A1A (card) | Cards, sidebar, nav |
| Accent (10%) | #2563EB (primary) | #3B82F6 (primary) | Interactive elements, selection |
| Destructive | #EF4444 | #EF4444 | Destructive actions only |
| Muted text | #71717A | #A1A1AA | Secondary text, placeholders |

### Agent Registry UI Extensions

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| status-idle | #10B981 | #10B981 | Agent idle/available |
| status-busy | #3B82F6 | #3B82F6 | Agent working on task |
| status-error | #EF4444 | #EF4444 | Agent error state |
| status-waiting | #F59E0B | #F59E0B | Waiting for leader/user |
| status-blocked | #DC2626 | #DC2626 | Blocked/escalation required |
| secretary-accent | #8B5CF6 | #8B5CF6 | Secretary special role highlight |
| ceo-accent | #F59E0B | #F59E0B | CEO special role highlight |
| drag-preview | rgba(59, 130, 246, 0.15) | rgba(59, 130, 246, 0.25) | Drag preview background |
| drag-valid | #10B981 | #10B981 | Valid drop target indicator |
| drag-invalid | #EF4444 | #EF4444 | Invalid drop target indicator |
| pin-active | #2563EB | #3B82F6 | Right panel pinned state |

Accent reserved for:
- Selected agent/node highlight
- Active tab indicator
- Primary action buttons
- Drag-active states
- Secretary/CEO role badges

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (create agent) | "Create Agent" |
| Primary CTA (save changes) | "Save Changes" |
| Empty state heading (no agents) | "No agents yet" |
| Empty state body | "Create your first agent to start building your team." |
| Empty state action | "Create Agent" |
| Error state | "Unable to load agents. Check your connection and try again." |
| Destructive confirmation (delete agent) | "Delete Agent: This will permanently remove {agentName} and all associated data. This action cannot be undone." |
| Destructive confirmation (reparent) | "Move Agent: {agentName} will report to {newParent}. Their current assignments will be transferred." |
| Drag-drop guidance (valid) | "Drop here to assign to {parentName}" |
| Drag-drop guidance (invalid cycle) | "Cannot move here — would create a circular reporting chain" |
| Drag-drop guidance (optimization) | "Tip: Consider assigning to {suggestedParent} for better workload balance" |
| Pin panel | "Pin panel" (tooltip) |
| Unpin panel | "Unpin panel" (tooltip) |
| View mode switcher labels | "Hierarchy", "Org Chart", "Teams" |
| Tab labels (right panel — agent subject) | "Profile", "Files", "History" |
| Doc editor tabs | "soul.md", "heartbeat.md", "tools.md", "agents.md", "interaction.md" |

---

## Visual Hierarchy

### Primary Focal Point
The **middle-pane hierarchy canvas** commands first attention — it occupies the largest screen area and displays the live agent organization with status overlays. The left pane serves as compact persistent navigation, while the right panel provides contextual detail for the selected subject.

### Visual Priority Order
1. Middle pane: hierarchy canvas with live status (60% visual weight)
2. Left pane: compact navigation tree (20% visual weight)
3. Right panel: contextual detail for selection (20% visual weight, collapsible)

## Component Specifications

### Three-Pane Layout

- Left pane: 240px fixed width (matches existing Sidebar), collapsible to 48px
- Middle pane: flex-grow, min-width 400px
- Right pane: 320px default, resizable (min 240px, max 480px), collapsible
- Dividers: 1px border color, 4px draggable handle on hover

### Agent Node (Tree/Canvas)

- Height: 40px (compact) / 56px (expanded on hover)
- Avatar: 28px circle
- Status indicator: 8px dot, positioned bottom-right of avatar
- Progress bar: 4px height (sm token), full width of node, indeterminate animation when active
- Hover card: 200px width, appears after 300ms delay, contains name, role, status, quick actions

### Right Panel

- Adaptive tabs based on subject type (agent, team, leader, task, project) per CONTEXT.md decision
- Agent subject default tabs: "Profile", "Files", "History"
- Pin toggle: icon button in panel header
- Edit sections: hover reveals edit button (pencil icon), 16px touch target
- File list: icon + name + modified date, 32px row height

### Drag-Drop States

- Drag start: node opacity 0.7, scale 1.02, box-shadow elevation
- Drag over valid: target background rgba(16, 185, 129, 0.1), border 2px dashed #10B981
- Drag over invalid: target background rgba(239, 68, 68, 0.1), border 2px dashed #EF4444
- Drop preview: ghost node showing new position, 50% opacity

### Interaction Editor Modes

- Split-pane: 40% file list / 60% editor (resizable)
- Tabbed: full-width tabs, one active doc
- Card-based: 280px cards in grid, expand to modal for editing
- Modal: 90vw x 90vh max, centered, esc to close

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | button, dialog, dropdown-menu, input, scroll-area, select, separator, badge | not required |

Third-party libraries (not shadcn registry):
| Library | Purpose | Vetting |
|---------|---------|---------|
| @dnd-kit/core + @dnd-kit/sortable | Drag-drop reparenting | MIT license, 2M+ weekly downloads, actively maintained, no audit flags — approved 2026-04-02 |
| react-resizable-panels | Three-pane layout | MIT license, 500K+ weekly downloads, accessible keyboard support, no audit flags — approved 2026-04-02 |

New shadcn components to add via CLI:
- tooltip (for hover actions)
- tabs (for right panel)
- textarea (for doc editing)
- collapsible (for section folding)

---

## Animation Specifications

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Panel collapse/expand | 200ms | ease-out | User toggle |
| Hover card appear | 150ms | ease-out | 300ms hover delay |
| Status indicator pulse | 2000ms | ease-in-out | Agent working state |
| Drag lift | 100ms | ease-out | Drag start |
| Drag drop | 150ms | ease-out | Drop complete |
| Modal open | 200ms | cubic-bezier(0.16, 1, 0.3, 1) | Trigger click |
| Modal close | 150ms | ease-in | Close action |
| Progress bar indeterminate | 1500ms | linear infinite | Agent working |

---

## Responsive Behavior

- Minimum window width: 900px (below this, right panel auto-collapses)
- Below 1200px: middle pane takes priority, right panel collapsible
- Touch devices: increase hit targets to 44px minimum

---

## Accessibility Requirements

- All interactive elements: focus-visible ring (2px offset, accent color)
- Drag-drop: keyboard accessible via cut/paste pattern
- Status indicators: not color-only (icons + text)
- Right panel: aria-label for pin/unpin actions
- Modal: focus trap, escape to close, aria-modal

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
