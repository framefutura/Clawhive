---
phase: 04-multi-agent-core
plan: 04-02-01
status: complete
completed_at: "2026-04-03"
---

# 04-02-01 Summary: Agent Registry UI — Shared Model, IPC, and Shell Seams

## What Was Built

Established the shared agent data model, IPC surface, and top-level three-pane workspace seams needed by all Phase 4.02 UI work.

## Key Files

- `apps/desktop/app/src/common/agent.ts`
  - Extended `AgentRole` to include CEO, CFO, COO, Department Head, Team Leader, Individual Agent, and Secretary.
  - Added `AgentStatus` (idle, working, error, waiting-for-leader, waiting-for-user, blocked).
  - Added `AgentLifecycle` (persistent, ephemeral, user-choice).
  - Added `AgentDocs` and `AgentCustomizationRefs` interfaces.
  - Added `AGENT_DOC_KEYS` constant for editable doc keys.
  - Expanded `AgentRecord` with `status`, `lifecycle`, `docs`, `customizations`, `avatarLabel`, `summary`, and `lastActiveAt`.

- `apps/desktop/app/src/main/agent-registry.ts`
  - Updated `createAgent()` to seed 4.02 defaults (status, lifecycle, docs, customizations, avatarLabel, summary).
  - `validateHierarchy()` remains the single source of truth for circular-reference and parent-role rules.

- `apps/desktop/app/src/main/index.ts`
  - IPC handlers `agent:create` and `agent:list` return richer records.
  - Added `agent:update` handler for partial agent updates through the registry.
  - Added `agent:hierarchy` handler exposing the registry hierarchy.

- `apps/desktop/app/src/renderer/App.tsx`
  - Replaced placeholder local agent state with real registry loading via `window.clawhive.getAgents()`.
  - Added `selectedSubjectId`, `rightPanelPinned`, and `rightPanelSubjectId` state.
  - Implemented three-pane shell: left (hierarchy/navigation), middle (tabs/workspace), right (contextual detail with pin/unpin support).
  - Preserved existing top bar, settings, file manager, and security surfaces.

- `apps/desktop/app/src/renderer/components/AgentWizard.tsx`
  - Added `'Secretary'` to `ROLES`.
  - Updated `getSuggestedParent()` with Secretary → CEO guidance.
  - Lightweight renderer-side validation aligned with main-process rules.
  - Preserved the existing 5-step creation flow and submit payload.

## Tests Added

- `apps/desktop/app/src/renderer/App.test.ts`
  - Contract tests for real agent loading, three-pane state, and pin/unpin behavior.

- `apps/desktop/app/src/renderer/components/AgentWizard.test.ts`
  - Tests for Secretary support and hierarchy guidance.

## Verification

- `pnpm test` passes (adjusted vitest configs to include test scaffolds).
- `pnpm tsgo` passes.
- Commit: `5eee6d03d7`

## Decisions

- Kept renderer-side hierarchy guidance lightweight instead of duplicating main-process rules.
- Right panel is a seam only in Wave 1; full detail editing comes in Wave 3.

## Deviations

- Fixed loadAgents ordering (declared before callback usage) to avoid TDZ.
- Fixed right panel pin seam so it renders from `rightPanelSubjectId` rather than just `selectedSubjectId`.
- Reduced hierarchy drift by removing over-eager CEO child constraints in the wizard.
