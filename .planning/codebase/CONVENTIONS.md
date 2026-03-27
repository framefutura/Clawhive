# Coding Conventions

**Analysis Date:** 2026-03-27

## Language and Toolchain

**Language:** TypeScript ESM (ECMAScript modules)
- `"type": "module"` in `package.json`
- All source files use `.ts` extension; `.js` only for built output
- Target: ES2023, DOM + DOM.Iterable + ScriptHost libs

**TypeScript Config:** `tsconfig.json`
- `module`: `NodeNext`, `moduleResolution`: `NodeNext`
- `strict: true` -- no implicit `any`; do not add `@ts-nocheck`
- `noEmitOnError: true`
- `forceConsistentCasingInFileNames: true`
- `allowSyntheticDefaultImports: true`, `esModuleInterop: true`

**Formatter:** `oxfmt --write` (configured via `oxfmt.json` or defaults)
- Run via `pnpm format`, check via `pnpm format:fix`
- Check mode: `oxfmt --check`

**Linter:** `oxlint --type-aware` (via `.oxlintrc.json`)
- Plugins: `unicorn`, `typescript`, `oxc`
- Categories enforced at `error` level: `correctness`, `perf`, `suspicious`
- Run lint via `pnpm lint`; combined with tsgo under `pnpm check`
- Do not disable `no-explicit-any`; prefer `unknown` or narrow type adapters
- Never add `@ts-nocheck` or blanket inline suppressions; fix root causes first
- Known suppressed rules: `prefer-array-find`, `no-await-in-loop`, `no-new`, `no-shadow`, `no-unmodified-loop-condition`, `no-accumulating-spread`, `no-async-endpoint-handlers`, `no-map-spread`

**Path Aliases** (in `tsconfig.json` `paths` and `vitest.config.ts`):
```json
"openclaw/extension-api": ["./src/extensionAPI.ts"],
"openclaw/plugin-sdk": ["./src/plugin-sdk/index.ts"],
"openclaw/plugin-sdk/*": ["./src/plugin-sdk/*.ts"]
```
Use these aliases in production code -- never relative paths into `src/` from extensions.

---

## Naming Patterns

**Files:**
- Use kebab-case: `safe-regex.ts`, `temp-path-guard.ts`, `file-context.ts`
- Tests: co-located, same name with `.test.ts` suffix: `safe-regex.test.ts`
- E2E tests: `*.e2e.test.ts`
- Live tests: `*.live.test.ts`
- Browser (Playwright) UI tests: `*.browser.test.ts`

**Types and Interfaces:**
- PascalCase: `type MediaFetchErrorCode = ...`, `interface FetchMediaOptions { ... }`
- Error codes are string literal unions: `type FooErrorCode = "max_bytes" | "http_error" | "fetch_failed"`

**Classes:**
- PascalCase: `class AcpRuntimeError extends Error { ... }`

**Functions and Variables:**
- camelCase: `fetchRemoteMedia`, `parseContentDispositionFileName`, `detectMime`
- Private/internal helpers also camelCase (no underscore prefix convention)

**Constants:**
- SCREAMING_SNAKE_CASE for module-level primitives: `MEDIA_MAX_BYTES`, `DEFAULT_TTL_MS`
- Regular `const` for objects/functions exported as singletons

**Test Helpers and Factories:**
- camelCase prefixed with `create` or `make`: `createState()`, `makeChromeTestProc()`
- Helper functions within test files use camelCase without a prefix

---

## Import Organization

Imports are grouped and separated by blank lines. The canonical order in each file:

1. Node.js built-ins with `node:` prefix: `import fs from "node:fs/promises"`
2. Relative local imports: `import { foo } from "./utils.js"`
3. Relative parent/grandparent imports: `import { bar } from "../infra/errors.js"`
4. `openclaw/plugin-sdk` aliases: `import type { Foo } from "openclaw/plugin-sdk/core"`
5. Other package imports (third-party npm): `import express from "express"`

**Always include the `.js` extension on relative imports** (required for ESM `NodeNext`).

Use `import type { TypeName }` for type-only imports to enable tree-shaking and signal intent.

Example from `src/channels/plugins/index.ts`:
```typescript
export { getChannelPlugin, listChannelPlugins, normalizeChannelId } from "./registry.js";
export {
  applyChannelMatchMeta,
  buildChannelKeyCandidates,
  ...
  type ChannelEntryMatch,
  type ChannelMatchSource,
} from "./channel-config.js";
```

---

## Error Handling

**Custom Error Classes:**
- Define an error code type and a class extending `Error` with a typed `code` field
- Always pass `options?: { cause?: unknown }` to `super()` for error chaining
- Set `this.name` explicitly
- Use a `isXxxError(value: unknown)` type guard function

Example from `src/acp/runtime/errors.ts`:
```typescript
export type AcpRuntimeErrorCode = "ACP_BACKEND_MISSING" | "ACP_TURN_FAILED" | ...;

export class AcpRuntimeError extends Error {
  readonly code: AcpRuntimeErrorCode;
  override readonly cause?: unknown;

  constructor(code: AcpRuntimeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AcpRuntimeError";
    this.code = code;
    this.cause = options?.cause;
  }
}

export function toAcpRuntimeError(params: {
  error: unknown;
  fallbackCode: AcpRuntimeErrorCode;
  fallbackMessage: string;
}): AcpRuntimeError { ... }

export async function withAcpRuntimeErrorBoundary<T>(params: {
  run: () => Promise<T>;
  fallbackCode: AcpRuntimeErrorCode;
  fallbackMessage: string;
}): Promise<T> { ... }
```

**Throwing:**
- Throw typed errors for expected failures; let uncaught errors propagate for unexpected ones
- Never swallow errors silently; always handle or re-throw with context
- Use `cause` to chain errors: `throw new FooError("...", { cause: err })`

---

## Logging

**Do not use `console.log` / `console.error` in production code.** Use the internal logger at `src/logger.js`.

```typescript
import { logInfo, logError, logWarn } from "../logger.js";
```

Sensitive values are redacted before logging using `src/logging/redact.js`.

---

## Comments

**Use comments to explain why, not what.** The code should be self-explanatory for the "what."

- Add brief inline comments for non-obvious logic or business rules
- Use `// Fallback: ...` or `// ignore parse errors` style for edge cases
- Avoid redundant comments that restate the code
- Do not leave `TODO` / `FIXME` comments without a linked issue or explanation

Example from `src/media/store.ts`:
```typescript
// Files are intentionally readable by non-owner UIDs so Docker sandbox containers can access
// inbound media. The containing state/media directories remain 0o700, which is the trust boundary.
const MEDIA_FILE_MODE = 0o644;

// Recursive cleanup can prune an empty directory between mkdir and the later
// file open/write. Recreate once and retry the media write path.
```

---

## Class and Module Design

**Class behavior:** Do not share class behavior via prototype mutation (`applyPrototypeMixins`, `Object.defineProperty` on `.prototype`). Use explicit inheritance/composition.

**File size:** Aim for files under ~700 LOC as a guideline; split when it improves clarity or testability.

**Barrel exports:** Use re-export files (e.g., `index.ts` in each module directory) for grouping related exports. In `src/config/config.ts`, multiple `export * from` and `export { } from` statements consolidate public surface.

**Dynamic imports:** Do not mix `await import("x")` and static `import ... from "x"` for the same module in production paths. Create a dedicated `*.runtime.ts` boundary if lazy loading is needed.

---

## Function Design

**Return types:** Prefer explicit return types on exported functions (helps `pnpm tsgo` catch drift):
```typescript
export async function fetchRemoteMedia(options: FetchMediaOptions): Promise<FetchMediaResult> {
  // ...
}
```

**Parameter types:** Always type parameters; avoid `any`:
```typescript
export function parseContentDispositionFileName(header?: string | null): string | undefined
```

**Async:** Use `async/await` consistently; avoid mixing with raw `.then()` chains except for very short one-liners.

---

## American Spelling

Use American English in all code, comments, docs, and UI strings:
- "color" not "colour"
- "behavior" not "behaviour"
- "analyze" not "analyse"
- "canceled" not "cancelled"
- "modeling" not "modelling"

---

*Convention analysis: 2026-03-27*
