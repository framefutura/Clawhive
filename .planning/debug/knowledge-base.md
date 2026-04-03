# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## execution-report-ts-bucket — TypeScript errors in execution-report.ts and authorization-manager.ts
- **Date:** 2026-04-03
- **Error patterns:** TS5097, .ts import extension, TS2552, ExecutionReport re-export alias, TS2353, agentName unknown property CompactReport, TS2339, constructor.getTypeDescription, TS2484, duplicate export declarations
- **Root cause:** Five distinct issues: (1) wrong import extension .ts instead of .js, (2) re-export uses unaliased name ExecutionReport when imported as AuthExecutionReport, (3) CompactReport missing agentName field, (4) accessing static method via .constructor instead of class name, (5) redundant re-export block conflicting with inline exports
- **Fix:** (1) Changed .ts to .js on import. (2) Changed re-export to use alias. (3) Added agentName to CompactReport. (4) Used SensitiveDataClassifier.getTypeDescription() directly. (5) Removed duplicate export block.
- **Files changed:** apps/desktop/app/src/main/execution-report.ts, apps/desktop/app/src/main/authorization-manager.ts
---

## storage-then-sandbox-ts-buckets — TypeScript 'never' type errors in storage.ts and sandboxed-bridge.ts
- **Date:** 2026-04-03
- **Error patterns:** TS2339, Property does not exist on type never, NonNullable typeof resolves to never, spawn overload mismatch, db.run db.prepare db.exec db.export db.close on never, stdout stderr on kill killed on never
- **Root cause:** (1) storage.ts: db variable typed via NonNullable<typeof SQL> which resolves to never at compile time since SQL is let-initialized as null. All db method calls then fail on type never. (2) sandboxed-bridge.ts: spawn() env object missing required ProcessEnv fields causes overload intersection collapse to never, making child process typed as never.
- **Fix:** (1) Added SqlJsDatabase type alias derived from initSqlJs return type, replaced never-resolving db type. (2) Cast spawn env as NodeJS.ProcessEnv. (3) Added explicit column: unknown[] types to migration PRAGMA callbacks. (4) Added missing test type fields.
- **Files changed:** apps/desktop/app/src/main/storage.ts, apps/desktop/app/src/main/sandboxed-bridge.ts, apps/desktop/app/src/main/storage.test.ts
---

## renderer-security-filepreview-session-test-buckets — TypeScript errors in SecurityPanel, FilePreview, useSession test
- **Date:** 2026-04-03
- **Error patterns:** PermissionMatrix not exported, implicit any params, Uint8Array BlobPart mismatch, Session type mismatch, invalid GeneCategory values
- **Root cause:** (1) SecurityPanel.tsx imports PermissionMatrix from wrong module (main/security-manager instead of common/security). (2) FilePreview.tsx Uint8Array/BlobPart type mismatch. (3) useSession.test.ts mock data uses fields not on Session type (name/createdAt/updatedAt instead of modelConfig/genes/messages) and invalid GeneCategory values (coding/analysis instead of dev/data).
- **Fix:** Fixed import path for PermissionMatrix, added type annotations and Uint8Array cast, updated test mock data to match Session interface with valid GeneCategory values.
- **Files changed:** apps/desktop/app/src/renderer/components/SecurityPanel.tsx, apps/desktop/app/src/renderer/components/FilePreview.tsx, apps/desktop/app/src/renderer/hooks/useSession.test.ts
---

## ts-bucket-tool-registry-threat-role-template-editor — TS errors in tool-registry, threat-analyzer, RoleTemplateEditor preload types
- **Date:** 2026-04-03
- **Error patterns:** duplicate export conflict ToolDefinition AgentToolPermission, medium high low critical not assignable to ThreatLevel, role string not assignable to AgentRole, union drift, re-export, preload bridge type mismatch
- **Root cause:** (1) tool-registry.ts had redundant `export type { ToolDefinition, AgentToolPermission }` re-export when interfaces were already exported inline. (2) threat-analyzer.ts used severity union ('low'|'medium'|'high'|'critical') in analyzeToolChain where ThreatLevel ('safe'|'caution'|'dangerous'|'critical') was expected, without a mapping function. (3) preload/index.ts typed listRoleTemplates return as `{ role: string }` while RoleTemplateEditor.tsx expected `{ role: AgentRole }`.
- **Fix:** (1) Removed redundant export type line from tool-registry.ts. (2) Added severityToThreatLevel() mapping method in ThreatAnalyzer. (3) Imported AgentRole in preload/index.ts and changed listRoleTemplates return type to use AgentRole.
- **Files changed:** apps/desktop/app/src/main/tool-registry.ts, apps/desktop/app/src/main/threat-analyzer.ts, apps/desktop/app/src/preload/index.ts
---
