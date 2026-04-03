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
