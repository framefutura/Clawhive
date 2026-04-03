---
status: resolved
trigger: "TypeScript build fails in apps/desktop/app with dominant main-process buckets in src/main/storage.ts first, then src/main/sandboxed-bridge.ts"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:05:00Z
---

## Current Focus

hypothesis: storage.ts db variable typed as never because NonNullable<typeof SQL> resolves to never at compile time (SQL initialized as null); sandboxed-bridge.ts spawn env missing NODE_ENV causes overload reduction to never
test: fix type declarations and rerun tsc -b
expecting: all storage.ts and sandboxed-bridge.ts errors eliminated
next_action: apply fixes to both files

## Symptoms

expected: pnpm tsc -b should pass for storage.ts and sandboxed-bridge.ts
actual: ~80 errors in storage.ts (Property 'run'/'prepare'/'exec'/'export'/'close' does not exist on type 'never') and ~10 errors in sandboxed-bridge.ts (Property 'stdout'/'stderr'/'on'/'kill'/'killed' does not exist on type 'never')
errors: TS2339 on never type for db operations in storage.ts; TS2769 overload mismatch + TS2339 on never for child process in sandboxed-bridge.ts
reproduction: cd apps/desktop/app && pnpm tsc -b
started: These are next dominant buckets after execution-report / authorization-manager were resolved

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-03T00:01:00Z
  checked: storage.ts line 9 type declaration
  found: db typed as InstanceType<NonNullable<typeof SQL>['Database']> | null. Since SQL is let-initialized to null, NonNullable<typeof SQL> at compile-time resolves to never. So db is never | null, and after null guards it narrows to never.
  implication: Need to decouple the Database type from the runtime variable SQL

- timestamp: 2026-04-03T00:02:00Z
  checked: sandboxed-bridge.ts line 222-230 spawn call
  found: spawn('sh', ['-c', command], { env: { PATH: ..., HOME: ... } }) -- the env object is typed as ProcessEnv by overload resolution, but ProcessEnv requires NODE_ENV (from Electron types). The conflicting overloads cause intersection collapse to never.
  implication: Need to type-assert env or cast the spawn result

- timestamp: 2026-04-03T00:02:30Z
  checked: storage.ts line 45 initSchema parameter type
  found: initSchema takes typeof db which is never | null, so inside the function after the null check, database is never
  implication: initSchema parameter type also needs fixing

## Resolution

root_cause: (1) storage.ts: db variable type uses NonNullable<typeof SQL> which resolves to never at compile time since SQL is initialized as null. (2) sandboxed-bridge.ts: spawn() env object missing required ProcessEnv fields causes overload intersection collapse to never.
fix: (1) Added SqlJsDatabase type alias derived from initSqlJs return type, replaced never-resolving db type. (2) Cast spawn env to unknown as NodeJS.ProcessEnv. (3) Added explicit column: unknown[] types to migration PRAGMA callbacks. (4) Added missing security_level/role_name to test sessions and genes/allowedTools/defaultSecurityLevel to test agents.
verification: pnpm tsc -b shows zero errors from storage.ts, storage.test.ts, sandboxed-bridge.ts
files_changed: [apps/desktop/app/src/main/storage.ts, apps/desktop/app/src/main/sandboxed-bridge.ts, apps/desktop/app/src/main/storage.test.ts]
