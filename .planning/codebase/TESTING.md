# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Runner:**
- Vitest
- Root config: `vitest.config.ts`
- Additional configs: `vitest.unit.config.ts`, `vitest.gateway.config.ts`, `vitest.e2e.config.ts`, `vitest.extensions.config.ts`, `vitest.live.config.ts`, `vitest.channels.config.ts`, `ui/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions via `expect`

**Execution Model:**
- Pool: `forks` in `vitest.config.ts`
- Environment cleanup is automatic with `unstubEnvs: true` and `unstubGlobals: true` in `vitest.config.ts`
- Shared setup file: `test/setup.ts`

**Run Commands:**
```bash
pnpm test                        # Run the default parallel test wrapper
pnpm test -- <path-or-filter>    # Run scoped tests through the wrapper
pnpm test:fast                   # Run Vitest unit config directly
pnpm test:coverage               # Run coverage with vitest.unit.config.ts
pnpm test:e2e                    # Run e2e suites with vitest.e2e.config.ts
pnpm test:gateway                # Run gateway-focused suites
pnpm test:contracts:channels     # Run channel contract suites serially
pnpm test:contracts:plugins      # Run plugin contract suites serially
```

---

## Test File Organization

**Location:**
- Tests are primarily co-located with implementation files
- Core code: `src/**/*.test.ts`
- Extensions: `extensions/**/*.test.ts`
- Packages: `packages/**/*.test.ts`
- Shared test helpers and environment setup: `test/**/*.ts`
- UI tests: `ui/src/**/*.test.ts`, plus `*.browser.test.ts` and `*.node.test.ts` under `ui/src/**`

**Naming:**
- Unit tests: `*.test.ts`
- E2E tests: `*.e2e.test.ts`
- Live tests: `*.live.test.ts`
- Browser-specific UI tests: `*.browser.test.ts`
- Node-specific UI tests: `*.node.test.ts`

**Structure:**
```text
src/<feature>.ts
src/<feature>.test.ts

extensions/<plugin>/src/<feature>.ts
extensions/<plugin>/src/<feature>.test.ts

ui/src/<feature>.ts
ui/src/<feature>.test.ts
ui/src/<feature>.browser.test.ts
ui/src/<feature>.node.test.ts
```

Use co-located tests by default. Add cross-cutting shared helpers to `test/` or `src/test-utils/` instead of building ad-hoc duplicate fixtures inside many suites.

---

## Test Structure

**Suite Organization:**
Tests consistently use `describe` blocks with narrowly named `it` cases and small local factory helpers.

Pattern from `src/agents/auth-health.test.ts` and `ui/src/ui/controllers/chat.test.ts`:
```typescript
import { afterEach, describe, expect, it, vi } from "vitest";

function createState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    chatAttachments: [],
    chatLoading: false,
    ...overrides,
  };
}

describe("handleChatEvent", () => {
  it("returns null when payload is missing", () => {
    const state = createState();
    expect(handleChatEvent(state, undefined)).toBe(null);
  });

  it("returns null when sessionKey does not match", () => {
    const state = createState({ sessionKey: "main" });
    expect(handleChatEvent(state, payload)).toBe(null);
  });
});
```

**Patterns:**
- Use `describe()` for module or scenario grouping
- Use `it()` with behavioral names that state the expected outcome
- Build reusable factory helpers inside the test file for setup (`createState`, `createMockRuntimeFixture`, `makeChromeTestProc`)
- Keep expectations close to the action under test
- Prefer multiple focused test cases over one large table unless the behavior is naturally parametric

**Setup pattern:**
- Global test environment setup lives in `test/setup.ts`
- Suite-local lifecycle hooks use `beforeAll`, `beforeEach`, `afterEach`, `afterAll`
- Temporary directories and other resources are created in `beforeAll`/`beforeEach` and torn down in `afterAll`/`afterEach`

**Teardown pattern:**
- Restore mocks after each test with `vi.restoreAllMocks()`
- Restore env and globals with `vi.unstubAllEnvs()` and `vi.unstubAllGlobals()` when a suite mutates them
- Return timers to real mode with `vi.useRealTimers()` after fake-timer tests
- Explicitly clean temp files and directories with `fs.rm(..., { recursive: true, force: true })`

---

## Mocking

**Framework:**
- Vitest mocks via `vi.mock`, `vi.spyOn`, `vi.mocked`, `vi.stubEnv`

**Patterns:**
Pattern from `test/setup.ts` and `src/media/host.test.ts`:
```typescript
vi.mock("@mariozechner/pi-ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("@mariozechner/pi-ai")>();
  return {
    ...original,
    getOAuthApiKey: () => undefined,
    getOAuthProviders: () => [],
    loginOpenAICodex: vi.fn(),
  };
});

const rmSpy = vi.spyOn(fs, "rm").mockResolvedValue(undefined);
vi.stubEnv("OPENCLAW_STATE_DIR", stateDir);
```

Pattern from `src/cli/update-cli/restart-helper.test.ts`:
```typescript
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));
```

**What to Mock:**
- External dependencies and SDKs: e.g. `@mariozechner/pi-ai` in `test/setup.ts`
- Node platform surfaces: `node:child_process`, `node:fs`, network request implementations
- Environment-dependent behavior via `vi.stubEnv(...)`
- Process/platform getters via `vi.spyOn(process, "platform", "get")`
- Individual filesystem or HTTP calls when isolating a helper function

**What NOT to Mock:**
- Business logic in the unit under test
- Pure helper functions unless they are specifically the seam being validated
- End-to-end adapter contracts when the repo already provides a shared contract harness, such as `src/acp/runtime/adapter-contract.testkit.ts`

**Mock Cleanup:**
- Use `vi.restoreAllMocks()` in `afterEach`
- Use `vi.unstubAllEnvs()` and `vi.unstubAllGlobals()` when relevant
- The repo relies on automatic env/global unstubbing from `vitest.config.ts`, but suites still perform explicit cleanup when they manipulate state heavily

---

## Fixtures and Factories

**Test Data:**
Test files commonly define small inline factories.

Pattern from `ui/src/ui/controllers/chat.test.ts`:
```typescript
function createState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    chatAttachments: [],
    chatLoading: false,
    chatMessage: "",
    chatMessages: [],
    ...overrides,
  };
}
```

Pattern from `extensions/acpx/src/runtime.test.ts`:
```typescript
let sharedFixture: Awaited<ReturnType<typeof createMockRuntimeFixture>> | null = null;

beforeAll(async () => {
  sharedFixture = await createMockRuntimeFixture();
});
```

Pattern from `src/test-utils/channel-plugins.ts`:
```typescript
export const createTestRegistry = (channels: TestChannelRegistration[] = []): PluginRegistry => ({
  plugins: [],
  channels: channels as unknown as PluginRegistry["channels"],
  ...
});
```

**Location:**
- One-off test fixtures stay local to the suite file
- Shared reusable fixtures/helpers live in `src/test-utils/`
- Global environment setup lives in `test/setup.ts`
- UI-specific project configuration lives in `ui/vitest.config.ts`
- Extension-local reusable fixtures live under that extension, e.g. `extensions/acpx/src/test-utils/runtime-fixtures.ts`

Use a local factory first. Promote it to `src/test-utils/` only after it is shared by multiple suites.

---

## Coverage

**Requirements:**
- Coverage provider: V8 in `vitest.config.ts`
- Reporter: `text`, `lcov`
- Thresholds in `vitest.config.ts`:
  - lines: 70
  - functions: 70
  - branches: 55
  - statements: 70
- Coverage only counts files actually exercised (`all: false`)
- Coverage include root is anchored to `./src/**/*.ts`
- Coverage excludes many integration-heavy surfaces such as `extensions/**`, `apps/**`, `ui/**`, `src/cli/**`, `src/commands/**`, `src/acp/**`, `src/agents/**`, `src/gateway/**`

**View Coverage:**
```bash
pnpm test:coverage
```

When adding new tests for core code, prefer coverage-relevant units under `src/**` rather than relying on broader extension or e2e surfaces.

---

## Test Types

**Unit Tests:**
- Primary test type across `src/**`, `extensions/**`, and `ui/**`
- Validate small helpers, controllers, config resolution, runtime adapters, and formatting logic
- Usually isolate I/O via mocks and spies

**Integration Tests:**
- Present where behavior spans multiple seams or real subprocess/network adapters
- Example patterns: local HTTP/WebSocket servers in `extensions/browser/src/browser/chrome.test.ts`, adapter contract suites in `extensions/acpx/src/runtime.test.ts`
- Favor realistic setup over excessive mocking when validating protocol or runtime boundaries

**Contract Tests:**
- Shared contract harnesses are used for runtime/plugin surfaces, e.g. `src/acp/runtime/adapter-contract.testkit.ts`
- Run through targeted commands like `pnpm test:contracts:channels` and `pnpm test:contracts:plugins`

**E2E Tests:**
- Used and intentionally separated via `*.e2e.test.ts`
- Run with `pnpm test:e2e`
- Excluded from default unit runs in `vitest.config.ts`

**Live Tests:**
- Used for real-key or real-service verification via `*.live.test.ts`
- Excluded from default unit runs in `vitest.config.ts`

**UI Browser Tests:**
- UI project uses Vitest browser mode with Playwright in `ui/vitest.config.ts`
- Browser tests live in `ui/src/**/*.browser.test.ts`

---

## Common Patterns

**Async Testing:**
Use `await expect(...).rejects` or collect async iterator output explicitly.

Pattern from `src/acp/runtime/errors.test.ts`:
```typescript
await expect(
  withAcpRuntimeErrorBoundary({
    run: async () => {
      throw new Error("boom");
    },
    fallbackCode: "ACP_TURN_FAILED",
    fallbackMessage: "fallback",
  }),
).rejects.toMatchObject({
  name: "AcpRuntimeError",
  code: "ACP_TURN_FAILED",
  message: "boom",
});
```

Pattern from `extensions/acpx/src/runtime.test.ts`:
```typescript
const events = [];
for await (const event of runtime.runTurn({
  handle,
  text: "hello world",
  mode: "prompt",
  requestId: "req-test",
})) {
  events.push(event);
}
expect(events).toContainEqual({ type: "done", stopReason: "end_turn" });
```

**Error Testing:**
- Assert on typed error shape with `toMatchObject`
- Assert on rejection with `rejects.toThrow(...)` or `rejects.toMatchObject(...)`
- Prefer checking stable error codes/messages over full stack traces

**Timer Testing:**
- Use `vi.useFakeTimers()` only when controlling time-dependent logic
- Always return to real timers after the test or in `afterEach`

**Environment Testing:**
- Use `vi.stubEnv(...)` instead of mutating `process.env` directly when possible
- When direct mutation is necessary, capture previous values and restore them in `finally`, as seen in `extensions/acpx/src/runtime.test.ts`

**File and Network Resource Testing:**
- Use temporary directories via `fs.mkdtemp(...)`
- Start ephemeral servers inside the test and close them in `finally` or `afterAll`
- Prefer loopback HTTP/WebSocket fixtures over hitting real services in unit tests

---

*Testing analysis: 2026-03-27*
