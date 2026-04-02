---
phase: 04-02
slug: agent-registry-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 04-02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- apps/desktop/app/src/renderer` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- apps/desktop/app/src/renderer`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-02-01 | 01 | 1 | AGENT-02 | unit | `pnpm test -- hierarchy` | ❌ W0 | ⬜ pending |
| 04-02-02 | 01 | 1 | AGENT-07 | unit | `pnpm test -- useAgentStatus` | ❌ W0 | ⬜ pending |
| 04-02-03 | 01 | 1 | AGENT-08 | unit | `pnpm test -- HierarchyViewSwitcher` | ❌ W0 | ⬜ pending |
| 04-02-04 | 02 | 2 | AGENT-09 | unit | `pnpm test -- useDragReparent` | ❌ W0 | ⬜ pending |
| 04-02-05 | 02 | 2 | AGENT-09 | integration | `pnpm test -- DragDropProvider` | ❌ W0 | ⬜ pending |
| 04-02-06 | 03 | 2 | AGENT-10 | unit | `pnpm test -- FilesTab` | ❌ W0 | ⬜ pending |
| 04-02-07 | 03 | 2 | AGENT-11 | unit | `pnpm test -- SecretaryNode` | ❌ W0 | ⬜ pending |
| 04-02-08 | 04 | 3 | AGENT-13 | integration | `pnpm test -- RoleTemplateEditor` | ❌ W0 | ⬜ pending |
| 04-02-09 | 04 | 3 | AGENT-14 | integration | `pnpm test -- DocEditor` | ❌ W0 | ⬜ pending |
| 04-02-10 | 04 | 3 | AGENT-15 | unit | `pnpm test -- InteractionEditor` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/desktop/app/src/renderer/hooks/useDragReparent.test.ts` — cycle detection unit tests
- [ ] `apps/desktop/app/src/common/agent.test.ts` — AgentRecord type extension tests / compile checks
- [ ] `apps/desktop/app/src/renderer/components/hierarchy/HierarchyViewSwitcher.test.tsx` — hierarchy mode rendering tests
- [ ] `apps/desktop/app/src/renderer/components/detail/AdaptiveTabBar.test.tsx` — right panel adaptive tab tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Three-pane layout resizing and collapse behavior | AGENT-02, AGENT-08 | Pointer-driven pane resize and persistence are hard to fully assert in unit tests | Launch app, drag left/right pane dividers, collapse/expand panes, verify layout remains usable and widths persist across reload |
| Drag-drop impact preview clarity | AGENT-09 | UX quality of guided confirmation and invalid-move messaging needs visual review | Drag agent to valid and invalid targets in all 3 modes; verify preview, clear rejection reason, optional comment field, and optimization suggestion appear correctly |
| Secretary dual-identity flow | AGENT-11 | Requires checking both org-tree presence and approval-bridge discoverability | Select Secretary node in hierarchy, confirm it appears as an agent and exposes approval/escalation bridge surface in right panel |
| CEO special treatment and org-wide context | AGENT-12 | Visual prominence and self-referential docs are best checked interactively | Select CEO node, confirm unique styling/prominence and access to org-wide synthesis/improvement docs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
