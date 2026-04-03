---
status: resolved
trigger: "ts-bucket-tool-registry-threat-role-template-editor"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: All three root causes confirmed and fixes applied
test: `pnpm tsc -b` in apps/desktop/app
expecting: Zero errors from tool-registry.ts, threat-analyzer.ts, RoleTemplateEditor.tsx
next_action: Await human verification

## Symptoms

expected: `cd /Volumes/S/Projects/clawhive/apps/desktop/app && pnpm tsc -b` passes for these files
actual: Duplicate export conflict in tool-registry.ts; ThreatLevel union mismatch in threat-analyzer.ts; preload/renderer role-template type drift in RoleTemplateEditor.tsx
errors: See handoff file TS-BUCKET-HANDOFF-2026-04-03.md buckets 4, 5, 9
reproduction: `cd /Volumes/S/Projects/clawhive/apps/desktop/app && pnpm tsc -b`
started: After prior TS buckets were fixed

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-03T00:01:00Z
  checked: tool-registry.ts lines 11-25 and line 419
  found: Lines 11-25 define and export `ToolDefinition` and `AgentToolPermission` interfaces inline. Line 419 has `export type { ToolDefinition, AgentToolPermission }` re-export which creates duplicate export identifiers.
  implication: Remove line 419 to fix the duplicate export.

- timestamp: 2026-04-03T00:02:00Z
  checked: threat-analyzer.ts line 18 and lines 540-587
  found: `ThreatLevel = 'safe' | 'caution' | 'dangerous' | 'critical'`. In `analyzeToolChain` (line 543), `maxSeverity` is typed as `'low' | 'medium' | 'high' | 'critical'`. Line 580 assigns `maxSeverity` to `riskLevel: ThreatLevel` which is incompatible. Also `ToolChainAnalysis.riskLevel` is `ThreatLevel` (line 68). The severity values from DANGEROUS_TOOL_COMBINATIONS are `'critical' | 'high' | 'medium' | 'low'` — these don't match ThreatLevel's `'safe' | 'caution' | 'dangerous' | 'critical'`.
  implication: Need a mapping function from severity ('low'|'medium'|'high'|'critical') to ThreatLevel ('safe'|'caution'|'dangerous'|'critical').

- timestamp: 2026-04-03T00:03:00Z
  checked: preload/index.ts lines 255-258 and RoleTemplateEditor.tsx line 38
  found: Preload `listRoleTemplates()` returns `Promise<{ role: string; docs: Record<string, string> }[]>`. RoleTemplateEditor calls `window.clawhive.listRoleTemplates()` and stores result in `useState<RoleTemplate[]>` where `RoleTemplate.role` is `AgentRole`. The `role: string` from preload is not assignable to `AgentRole`.
  implication: Two valid approaches: (a) change preload return type to use AgentRole, or (b) cast/widen in the component. The preload is the source of truth for the bridge API type; since the IPC handler likely stores role as a string, the cleanest fix is to widen the preload return type to use `AgentRole` instead of `string`, matching the component's expectation.

## Resolution

root_cause: Three independent type-surface issues: (1) tool-registry.ts has redundant re-export of already-exported names on line 419; (2) threat-analyzer.ts uses severity union ('low'|'medium'|'high'|'critical') where ThreatLevel ('safe'|'caution'|'dangerous'|'critical') is expected, without mapping; (3) preload bridge types listRoleTemplates as returning `{ role: string }` while component expects `{ role: AgentRole }`.
fix: (1) Removed redundant `export type { ToolDefinition, AgentToolPermission }` line from tool-registry.ts. (2) Added `severityToThreatLevel()` private method to ThreatAnalyzer that maps low->safe, medium->caution, high->dangerous, critical->critical; used it in analyzeToolChain return. (3) Imported AgentRole in preload/index.ts and changed listRoleTemplates return type from `{ role: string }` to `{ role: AgentRole }`.
verification: `pnpm tsc -b` passes for all three target files (0 errors from tool-registry.ts, threat-analyzer.ts, RoleTemplateEditor.tsx). Confirmed by human verification. Remaining 19 errors (7 other buckets) are outside this session's scope.
files_changed: [apps/desktop/app/src/main/tool-registry.ts, apps/desktop/app/src/main/threat-analyzer.ts, apps/desktop/app/src/preload/index.ts]
