# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**Monolithic Source Files:**

- `src/gateway/server.impl.ts` (~1,449 lines) -- Gateway server initialization. High risk when modifying startup sequence; all subsystems are wired in one function chain.
- `src/gateway/server-methods/chat.ts` (~1,688 lines) -- Core chat dispatch. All delivery, routing, and abort logic lives in one file; difficult to isolate for testing or feature work.
- `src/cron/service/timer.ts` (~1,263 lines) -- Cron job scheduling engine. Extensive catch/finally blocks and nested retry/backoff logic make it fragile to modify.
- `src/agents/pi-embedded-runner/run.ts` (~1,428 lines) -- Embedded agent runtime. Combines auth profile rotation, model resolution, hook invocation, and run loop in a single async function tree.
- `src/plugins/loader.ts` (~1,335 lines) -- Plugin registry and loader. Cache eviction, jiti alias resolution, and plugin lifecycle are interleaved.
- `src/config/io.ts` (~2,142 lines) -- Config file read/write, env substitution, includes, migrations, backup rotation, and security audit logging. Many concerns in one place.
- `src/security/audit.ts` (~1,504 lines) -- Security audit checker. Finding collection and module lazy-loading are mixed; hard to test individual check logic in isolation.

*Fix approach: Extract cohesive sub-modules (e.g., separate cron backoff, plugin cache eviction, config backup rotation) into dedicated files within the same directory.*

**Large Generated Files Committed to Source:**

- `src/config/schema.base.generated.ts` (~15,261 lines) -- Auto-generated config schema. Checked into source; drift between generation script and committed file is a recurring CI issue (see `pnpm config:schema:check`).
- `src/plugins/bundled-plugin-metadata.generated.ts` (~19,161 lines) -- Auto-generated plugin manifest metadata. Similarly large and generated.
- `src/config/bundled-channel-config-metadata.generated.ts` (~14,727 lines) -- Auto-generated channel config schema metadata.

*Fix approach: Move generated files out of `src/` into a build-time-only output directory (`dist/generated/`) and reference them at build time only. Keep baseline snapshots for drift detection.*

**Widespread `catch (err)` Error Handling:**

The codebase has hundreds of `catch (err)` blocks where errors are caught with no type guard (`err: unknown`) and many silently swallow errors without re-throwing or logging. Key hotspots:
- `src/acp/control-plane/manager.core.ts` -- 16+ catch blocks, many nested
- `src/secrets/resolve.ts` -- 12+ catch blocks
- `src/cron/service/timer.ts` -- 12+ catch blocks
- `src/gateway/server-methods/chat.ts` -- 7+ catch blocks
- `src/agents/workspace.ts` -- 8 catch blocks

Many of these use `err` without checking `instanceof Error` first. This means TypeScript narrowing is bypassed and error `message` properties may be unreliable.

*Fix approach: Enforce `catch (err: unknown)` with a shared `isError()` guard helper; audit each catch site for whether errors should be re-thrown, logged, or silently ignored.*

**Widespread `typescript/no-explicit-any` Suppressions:**

Over 120 `// oxlint-disable-next-line typescript/no-explicit-any` suppressions exist across test and production files. Notable production-file suppressions:
- `src/plugins/hooks.ts` (lines 747, 754, 812, 819)
- `src/agents/tools/common.ts`
- `src/channels/plugins/types.plugin.ts`
- `src/gateway/tools-invoke-http.ts` (multiple)

*Fix approach: Replace `any` with proper union types or `unknown` + type narrowing. Use `Record<string, unknown>` or `object` where appropriate. For test mocks, prefer `vi.fn<() => unknown>` over `any`.*

**Broad `eslint/no-await-in-loop` Suppressions:**

19 `eslint-disable-next-line no-await-in-loop` suppressions exist (see `src/security/audit-extra.async.ts`, `src/security/fix.ts`, `src/test-utils/ports.ts`, etc.), allowing sequential awaits in loops instead of `Promise.all`.

*Fix approach: Audit each suppression; many are in test utilities where sequential ordering is intentional, but production code (audit, fix) should parallelize where safe.*

## Known Bugs

**Skipped Telegram Sticker Tests (Open -- #50185):**

- `extensions/telegram/src/bot.media.stickers-and-fragments.e2e.test.ts` has two `it.skip(...)` tests for static sticker download and cache refresh:
  - Line 36: `"downloads static sticker (WEBP) and includes sticker metadata"` -- skipped due to lack of deterministic static sticker fetch injection
  - Line 79: `"refreshes cached sticker metadata on cache hit"` -- skipped due to lack of deterministic cache-refresh assertions in CI
- Impact: Sticker download and cache behavior is exercised only by the passing `skips animated and video sticker formats` test; static sticker paths are unverified in CI.
- `extensions/telegram/src/sticker-cache.ts` is the implementation file.

*Fix approach: Implement deterministic fetch injection for static sticker downloads in the test harness.*

**`TODO` in ACP Translator for ErrorKind Field:**

- `src/acp/translator.ts:866`: `// refusals. TODO: when ChatEventSchema gains a structured errorKind field`
- Indicates refusal classification is currently heuristic (string matching) rather than typed.

*Fix approach: Add a structured `errorKind` field to `ChatEventSchema` and update the translator to use it.*

**Companion Bot Error Reporting (`openclaw.ai` Installer References):**

- The installer scripts at `public/install.sh`, `public/install-cli.sh`, `public/install.ps1` live in the sibling repo `../openclaw.ai` (not in this repo). Issues with the installer are not visible in this repo's CI.

*Fix approach: None within this repo; awareness that installer issues require checking the sibling repo.*

## Security Considerations

**Extension Code Excluded from OXLint:**

- `.oxlintrc.json` ignorePatterns include `extensions/`. All extension code is exempt from linting rules (`typescript/no-explicit-any`, `oxc/no-async-endpoint-handlers`, etc.).
- Boundary lint scripts (`pnpm lint:extensions:no-src-outside-plugin-sdk`, `pnpm lint:extensions:no-relative-outside-package`, etc.) enforce import boundaries but do not enforce code quality.
- Security-sensitive extensions: `extensions/voice-call/` (webhook security), `extensions/telegram/` (bot token handling), `extensions/discord/` (OAuth), `extensions/feishu/` (app secret handling).

*Fix approach: Either extend oxlint coverage to extensions with a dedicated config, or ensure boundary scripts catch the specific patterns that matter (e.g., SSRF, hardcoded credentials).*

**Exec Allowlist Wildcard Risk:**

- `src/security/audit.ts` (lines 876-881) checks for `tools.elevated.allowFrom.*` wildcards and raises critical findings. The audit logic is correct, but the `elevated` feature allows arbitrary command execution gated only by sender allowlist.
- `src/security/audit.ts` (lines 996-1007) also warns when `autoAllowSkills` is enabled, which widens the exec trust surface.

*Fix approach: Current audit checks are sound. Ensure `openclaw doctor` surfaces these findings prominently and that users are warned before enabling `elevated` mode.*

**Hardcoded Secret Env Var Names:**

- `src/config/io.ts:63-83` enumerates a hardcoded list of ~20 `SHELL_ENV_EXPECTED_KEYS` (API key env var names like `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.).
- Any new provider must also update this list or the env var won't be used in config resolution.

*Fix approach: Replace hardcoded list with a dynamically generated list from provider definitions. Current approach is a maintenance hazard.*

**Windows Node.js CVE-2024-27980 Reference:**

- `src/process/exec.ts:44`: `// On Windows, Node 18.20.2+ (CVE-2024-27980) rejects spawning .cmd/.bat directly`
- The comment acknowledges the CVE but the fix approach (rejecting `.cmd/.bat` spawns) is implicit in the code, not explicitly documented.

*Fix approach: Add a top-level comment explaining the Windows mitigation strategy in `exec.ts`.*

## Performance Bottlenecks

**Config File Re-read on Every Gateway Reload:**

- `src/gateway/server.impl.ts:407`: `configSnapshot = await readConfigFileSnapshot()` is called multiple times during startup (initial, post-migration, post-auto-enable).
- `src/config/io.ts` has extensive file I/O, env substitution, JSON5 parsing, and backup rotation on every write.

*Fix approach: Cache the validated config snapshot in memory and only re-read when the file's mtime changes (already partially implemented via `ConfigHealthState`). Ensure the re-read path is only triggered by actual file changes.*

**Plugin Loader Registry Cache with Fixed Cap:**

- `src/plugins/loader.ts:115-116`: `MAX_PLUGIN_REGISTRY_CACHE_ENTRIES = 128`. The cache uses a simple LRU-style eviction by delete-and-reinsert.
- In environments with many plugin configurations, cache thrashing could occur.

*Fix approach: Consider `Map` replacement with `lru-cache` package, or make the cap configurable.*

**Cron Startup Catch-up Sequential Execution:**

- `src/cron/service/timer.ts:918-921`: `runStartupCatchupCandidate` runs each startup catch-up job sequentially in a for loop.
- `src/cron/service/timer.ts:1002-1004`: `runDueJobs` also executes due jobs sequentially.

*Fix approach: Parallelize startup catch-up with `Promise.all()`, respecting the per-job concurrency setting. Due jobs may need to stay sequential if they share state.*

**Slow `exec-approval` Audit Processing:**

- `src/security/audit-extra.async.ts` and `src/security/fix.ts` have multiple `no-await-in-loop` suppressions, suggesting sequential processing of exec approval audit records.

*Fix approach: Parallelize independent audit record processing with bounded concurrency.*

## Fragile Areas

**Config Env Substitution (String-based):**

- `src/config/env-substitution.ts` uses string matching for `${VAR}` substitution patterns. No schema-aware validation ensures substituted values match expected types.
- `src/config/io.ts:251` uses a regex `OPEN_DM_POLICY_ALLOW_FROM_RE` to parse DM policy strings, which is brittle.

*Fix approach: Migrate string-based policy parsing to structured Zod schemas.*

**Pi Session Transcript Append Pattern:**

- `src/gateway/server-methods/CLAUDE.md` (in-repo guidance): "Pi session transcripts are a `parentId` chain/DAG; never append Pi `type: "message"` entries via raw JSONL writes... Always write transcript messages via `SessionManager.appendMessage(...)`."
- `src/agents/pi-embedded-runner/transcript-rewrite.ts` rewrites session files directly, which could corrupt the parentId chain if not careful.

*Fix approach: The CLAUDE.md guidance is correct; enforce via a lint rule that `SessionManager.appendMessage()` is the only allowed write path.*

**Session Key Parsing is Heavily Context-Dependent:**

- `src/gateway/server-methods/chat.ts:152-251`: `resolveChatSendOriginatingRoute()` has extensive branching logic based on session key format, client metadata, channel hints, and legacy shape detection.
- Easy to introduce subtle routing bugs when modifying.

*Fix approach: Extract `resolveChatSendOriginatingRoute` into a dedicated unit-testable module with exhaustive test coverage.*

**ACP Control Plane Manager (manager.core.ts -- ~1,732 lines):**

- `src/acp/control-plane/manager.core.ts` is the largest single logical file. It combines lifecycle management, identity reconciliation, job scheduling, and diagnostics.
- 16+ nested catch blocks make error recovery unpredictable.

*Fix approach: Extract sub-responsibilities (identity reconciliation, job lifecycle, diagnostics) into separate modules within `src/acp/control-plane/`.*

**Deprecation Surface:**

The codebase has extensive deprecation. Key migration targets:
- `extensionAPI.ts` (deprecated in favor of `openclaw/plugin-sdk/*`) -- `src/extensionAPI.ts:11`
- `plugin-sdk/compat.ts` (deprecated in favor of focused subpath imports) -- `src/plugin-sdk/compat.ts:11`
- `config/types.base.ts` `dm` alias (deprecated in favor of `direct`) -- `src/config/types.base.ts:81`
- `config/types.slack.ts` `replyTo` (deprecated in favor of `replyToModeByChatType`) -- `src/config/types.slack.ts:26`
- `config/zod-schema.session.ts` `pruneAfter` (deprecated in favor of `pruneDays`) -- `src/config/zod-schema.session.ts:76`
- `plugin-sdk/provider-web-search.ts` deprecated pattern -- `src/plugin-sdk/provider-web-search.ts:70`
- `gateway/client.ts` `connectChallengeTimeoutMs` alias -- `src/gateway/client.ts:82`
- `gateway/channel-health-monitor.ts` multiple deprecated timing fields -- `src/gateway/channel-health-monitor.ts:35-39`
- `src/gateway/server-cron.ts:398`: deprecated `notify+cron.webhook` fallback
- `src/agents/pi-auth-json.ts:48`: deprecated runtime auth approach

*Fix approach: Prioritize migration of `extensionAPI.ts` and `plugin-sdk/compat.ts` since they affect the public plugin SDK surface. Others can be handled in context when related code is touched.*

## Test Coverage Gaps

**Unit Test Coverage Exclusions (V8 thresholds: lines 70%, functions 70%, branches 55%, statements 70%):**

The following directories/surfaces are entirely excluded from coverage thresholds:
- `src/agents/**` (~600+ files) -- Agent runtime, model selection, sandbox, skills, tools, subagents, compact, failover, auth profiles, etc.
- `src/gateway/**` -- Server implementation, client, protocol, WS connection, call bridge, node-host
- `src/channels/**` -- Channel implementations (telegram, discord, slack, signal, imessage, web)
- `src/plugins/**` -- Plugin loader, hooks, runtime, bundling, discovery, update
- `src/acp/**` -- ACP control plane, persistent bindings
- `src/infra/**` (partial) -- Tailscale, outbound session, ports inspection, update check, skills remote, state migrations
- `src/hooks/**` -- All hook implementations
- `src/daemon/**` -- Launchd/systemd integration
- `src/commands/**` -- All CLI commands
- `src/tui/**` -- Terminal UI
- `src/wizard/**` -- Setup wizard

This means roughly 70% of the source tree has no enforced coverage threshold. The 70% line/function/statement thresholds apply only to a small set of utility and shared modules.

*Fix approach: Incrementally add coverage requirements for critical paths. Start with `src/security/**`, `src/secrets/**`, `src/config/` (excluding generated files), and `src/media/**`.*

**26 Test Files with `.skip()` or `it.skip` / `test.skip`:**

- `src/secrets/resolve.test.ts` -- Skipped tests
- `src/cron/store.test.ts`, `src/cron/run-log.test.ts` -- Skipped tests
- `src/image-generation/runtime.live.test.ts` -- Live test skipped
- `src/agents/zai.live.test.ts`, `src/agents/xai.live.test.ts`, `src/agents/pi-embedded-runner-extraparams.live.test.ts` -- Live provider tests
- `src/gateway/gateway-models.profiles.live.test.ts`, `src/gateway/android-node.capabilities.live.test.ts` -- Live gateway tests
- `src/infra/restart-stale-pids.test.ts`, `src/infra/ports.test.ts` -- Infrastructure tests

Most skipped tests are live tests requiring real API keys (correctly skipped in unit runs). The concern is ensuring live test re-enablement is automated via environment variable gates rather than manual un-skipping.

**Live Test Coverage:**

- `pnpm test:live` requires `OPENCLAW_LIVE_TEST=1` or `LIVE=1`. These are never run in normal CI gates.
- Live tests cover: provider model selection, Android node capabilities, Claude token setup, various model providers (xai, zai, moonshot, minimax, byteplus, anthropic), and gateway CLI backend.

*Fix approach: Maintain a periodic CI job (e.g., nightly or weekly) that runs live tests and reports regressions.*

---

*Concerns audit: 2026-03-27*
