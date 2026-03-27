# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```
openclaw/
├── src/                        # Core TypeScript source (main package)
│   ├── acp/                    # ACP protocol layer
│   ├── agents/                 # Agent runtime, auth profiles, Pi runner
│   ├── auto-reply/             # Reply dispatch and templating
│   ├── channels/              # Shared channel logic and plugin contracts
│   ├── cli/                    # CLI wiring, program, commands registration
│   ├── commands/               # All user-facing CLI command implementations
│   ├── config/                # Config loading, validation, session stores
│   ├── gateway/                # Gateway server and client
│   ├── infra/                  # Shared infrastructure utilities
│   ├── logging/                # Logging subsystem
│   ├── media/                  # Media pipeline (fetch, store, convert)
│   ├── media-understanding/    # Media understanding providers
│   ├── plugins/                # Plugin loader, registry, runtime, SDK exports
│   ├── routing/                # Session key, account routing, bindings
│   ├── security/               # Security policy, audit, DM policy
│   ├── secrets/                # Secrets management
│   ├── sessions/               # Session lifecycle, transcripts
│   ├── shared/                 # Shared utilities (lazy-runtime, tailscale)
│   ├── test-utils/             # Shared test helpers
│   ├── tui/                    # Terminal UI (chat sessions, submit handlers)
│   ├── wizard/                 # Setup wizard
│   ├── channel-web.ts         # Web channel provider entry
│   ├── entry.ts               # CLI entry point (respawn, argv)
│   ├── index.ts               # Library exports for npm consumers
│   ├── library.ts             # Library-mode exports (gateway helpers)
│   ├── runtime.ts             # RuntimeEnv types and defaults
│   └── utils.ts               # Shared utilities
├── extensions/                # Workspace plugin packages (~70 plugins)
│   ├── acp/                   # ACP channel plugin
│   ├── anthropic/             # Anthropic provider plugin
│   ├── browser/               # Browser automation provider
│   ├── discord/               # Discord channel plugin
│   ├── google/                # Google provider plugin
│   ├── imessage/              # iMessage channel plugin
│   ├── microsoft/             # Microsoft provider plugin
│   ├── openai/                # OpenAI provider plugin
│   ├── signal/                # Signal channel plugin
│   ├── slack/                 # Slack channel plugin
│   ├── telegram/              # Telegram channel plugin
│   ├── whatsapp/              # WhatsApp channel plugin
│   └── [~50 more plugins]    # Providers, channels, tools
├── packages/                  # Additional workspace packages
│   ├── clawdbot/              # Clawd bot package
│   ├── memory-host-sdk/       # Memory host SDK
│   └── moltbot/              # Molt bot package
├── apps/                      # Native mobile/desktop applications
│   ├── android/              # Android Kotlin app
│   ├── ios/                  # iOS Swift app
│   └── macos/                # macOS SwiftUI/AppKit app
├── ui/                        # Web control UI (Lit-based, Vite build)
│   ├── src/                  # Lit web components
│   ├── vite.config.ts        # Vite bundler config
│   └── package.json
├── docs/                      # Mintlify documentation
├── vendor/                    # Vendored third-party code (a2ui spec/renderers)
├── scripts/                  # Build, release, packaging scripts
├── .planning/                 # Planning artifacts (this directory)
├── openclaw.mjs              # Root CLI wrapper script
├── package.json              # Root workspace manifest
├── pnpm-workspace.yaml       # pnpm workspace config
├── tsconfig.json             # TypeScript project config
├── vitest.config.ts         # Vitest test runner config
└── .oxlintrc.json            # Oxlint linter config
```

## Directory Purposes

**src/acp:**
- Purpose: Agent Communication Protocol - protocol layer between gateway and agent subprocesses
- Contains: `client.ts`, `server.ts`, `session.ts`, `session-mapper.ts`, `event-mapper.ts`, `translator.ts`, `control-plane/`, `runtime/`
- Key files: `src/acp/server.ts`, `src/acp/translator.ts`, `src/acp/control-plane/manager.ts`

**src/agents:**
- Purpose: Agent runtime, auth profiles, session management, Pi embedded runner
- Contains: `agent.ts`, `auth-profiles.ts`, `agent-scope.ts`, `acp-spawn.ts`, `cli-runner.ts`, `pi-embedded-runner/`, `skills/`, `defaults.ts`
- Key files: `src/agents/agent.ts`, `src/agents/auth-profiles.ts`, `src/agents/acp-spawn.ts`

**src/channels:**
- Purpose: Shared channel logic and plugin contracts, independent of any specific channel
- Contains: `plugins/` (registry, binding registry, contracts), `allowlists/`, `allow-from.ts`, `channel-config.ts`, `command-gating.ts`, `mention-gating.ts`
- Key files: `src/channels/plugins/types.ts`, `src/channels/plugins/registry.ts`, `src/channels/channel-config.ts`

**src/cli:**
- Purpose: CLI program building, argv routing, command registration, daemon lifecycle
- Contains: `run-main.ts`, `argv.ts`, `route.ts`, `program/`, `daemon-cli/`, `gateway-cli/`, `send-runtime/`
- Key files: `src/cli/run-main.ts`, `src/cli/route.ts`, `src/cli/program/program.ts`

**src/commands:**
- Purpose: All user-facing CLI command implementations
- Contains: `agent.ts`, `agents.ts`, `channels.ts`, `configure.ts`, `doctor.ts`, `onboard.ts`, `status.ts`, `sessions.ts`, `message.ts`, `backup.ts`, `auth-choice.ts`, `channel-setup/`
- Key files: `src/commands/agent.ts`, `src/commands/channels.ts`, `src/commands/configure.ts`

**src/config:**
- Purpose: Configuration system - loading, validation, session paths
- Contains: `config.ts`, `config-schema.ts`, `sessions/`, `channel-configured.ts`
- Key files: `src/config/config.ts`, `src/config/config-schema.ts`

**src/gateway:**
- Purpose: Gateway server (WebSocket/HTTP), gateway client, hook runner, cron service
- Contains: `server/`, `client.ts`, `boot.ts`, `hooks.ts`, `cron.ts`, `exec-approval-manager.ts`, `control-ui.ts`
- Key files: `src/gateway/server/server.impl.ts`, `src/gateway/client.ts`, `src/gateway/boot.ts`

**src/infra:**
- Purpose: Shared infrastructure utilities (no core business logic deps)
- Contains: `env.ts`, `errors.ts`, `binaries.ts`, `bonjour.ts`, `ports.ts`, `net/`, `fs-safe.ts`, `archive.ts`, `device-identity.ts`, `exec-approvals.ts`, `tls/`, `exec-allowlist-pattern.ts`
- Key files: `src/infra/errors.ts`, `src/infra/bonjour.ts`, `src/infra/net/ssrf.ts`

**src/media:**
- Purpose: Media pipeline - fetch, storage, MIME detection, conversion
- Contains: `fetch.ts`, `store.ts`, `mime.ts`, `image-ops.ts`, `ffmpeg-exec.ts`, `input-files.ts`, `server.ts`, `pdf-extract.ts`, `local-media-access.ts`
- Key files: `src/media/store.ts`, `src/media/server.ts`, `src/media/fetch.ts`

**src/plugins:**
- Purpose: Plugin loading, registry, runtime creation, hooks, SDK exports
- Contains: `loader.ts`, `registry.ts`, `runtime/`, `discovery.ts`, `bundled/`, `install.ts`, `update.ts`, `schema-validator.ts`, `hook-runner-global.ts`, `bundle-mcp.ts`, `command-registry-state.ts`
- Key files: `src/plugins/loader.ts`, `src/plugins/registry.ts`, `src/plugins/plugin-registry.ts`

**src/plugin-sdk:**
- Purpose: Public TypeScript API surface for extension authors
- Contains: `index.ts`, `core.ts`, `channel-runtime.ts`, `agent-runtime.ts`, `gateway-runtime.ts`, `hook-runtime.ts`, `media-runtime.ts`, `conversation-runtime.ts`, `config-runtime.ts`, and ~50 more subpath modules
- Key files: `src/plugin-sdk/index.ts`, `src/plugin-sdk/core.ts`, `src/plugin-sdk/channel-runtime.ts`

**src/routing:**
- Purpose: Session key normalization, account lookup, reply routing
- Contains: `session-key.ts`, `account-id.ts`, `account-lookup.ts`, `bindings.ts`, `resolve-route.ts`
- Key files: `src/routing/session-key.ts`, `src/routing/resolve-route.ts`

**extensions/*:**
- Purpose: Messaging channel and provider plugins as independent workspace packages
- Contains: Each plugin has `src/runtime.ts`, `src/setup.ts`, `src/channel.ts`, `src/config-schema.ts`, `openclaw.plugin.json`, `package.json`
- Key files: `extensions/telegram/src/runtime.ts`, `extensions/discord/src/runtime.ts`, `extensions/whatsapp/src/runtime.ts`

**apps/android:**
- Purpose: Android mobile companion app
- Contains: `MainActivity.kt`, `MainViewModel.kt`, `NodeApp.kt`, `NodeForegroundService.kt`, `gateway/`, `node/`, `ui/`, `voice/`, `chat/`
- Key files: `apps/android/app/src/main/java/ai/openclaw/app/MainActivity.kt`

**apps/ios:**
- Purpose: iOS mobile companion app
- Contains: `OpenClawApp.swift`, `Gateway/`, `Chat/`, `Model/`, `Voice/`, `Location/`, `Calendar/`, `Camera/`
- Key files: `apps/ios/Sources/OpenClawApp.swift`

**apps/macos:**
- Purpose: macOS menubar desktop app
- Contains: `OpenClaw/` (SwiftUI/AppKit app with CanvasManager, ChannelsStore, GatewayProcessManager, etc.)
- Key files: `apps/macos/Sources/OpenClaw/`

**ui/src:**
- Purpose: Lit-based web control UI served by gateway
- Contains: `main.ts`, `app.ts`, `controllers/`, `chat/`, `components/`, `i18n/`
- Key files: `ui/src/main.ts`, `ui/src/ui/app.ts`, `ui/src/ui/app-gateway.ts`

## Key File Locations

**Entry Points:**
- `openclaw.mjs`: Root CLI wrapper script (bin entry)
- `src/entry.ts`: Core CLI entry (respawn, argv, fast version path)
- `src/cli/run-main.ts`: `runCli()` - program building and command routing
- `src/gateway/server/server.impl.ts`: `startGatewayServer()` - gateway main

**Configuration:**
- `src/config/config.ts`: Config loading from `~/.openclaw/`
- `src/config/config-schema.ts`: JSON Schema for config validation
- `tsconfig.json`: TypeScript project config with path aliases

**Core Logic:**
- `src/gateway/server/server.impl.ts`: Gateway WebSocket/HTTP server
- `src/gateway/client.ts`: Gateway WebSocket client
- `src/plugins/loader.ts`: Plugin discovery and loading
- `src/acp/server.ts`: ACP gateway server
- `src/acp/translator.ts`: ACP-to-gateway bridge

**Testing:**
- Colocated `*.test.ts` files next to source
- `ui/vitest.config.ts`: Web UI test config
- `vitest.config.ts`: Root test config

## Naming Conventions

**Files:**
- TypeScript source: `kebab-case.ts` (e.g., `session-key.ts`, `channel-config.ts`)
- React-like UI: `PascalCase.ts` for components in `ui/src/ui/`
- Swift: `PascalCase.swift` (e.g., `OpenClawApp.swift`, `GatewaySettingsStore.swift`)
- Kotlin: `PascalCase.kt` (e.g., `MainActivity.kt`, `NodeApp.kt`)
- Test files: `*.test.ts` (colocated, matching source name)
- E2E tests: `*.e2e.test.ts`

**Directories:**
- Feature directories: `kebab-case/` (e.g., `channels/plugins/`, `cli/gateway-cli/`)
- Special directories: lowercase singular where appropriate (`src/channels/`, `src/cli/`)

**Functions/Variables:**
- camelCase: `createDefaultDeps`, `loadConfig`, `startGatewayServer`
- PascalCase: Classes (`GatewayClient`, `PluginRegistry`, `AcpGatewayAgent`)
- Type exports: PascalCase type names (`GatewayServerOptions`, `ChannelPlugin`)
- Constants: UPPER_SNAKE_CASE where appropriate (`GATEWAY_CLOSE_CODE_HINTS`)

## Where to Add New Code

**New Feature (CLI command):**
- Implementation: `src/commands/<feature-name>.ts`
- Tests: `src/commands/<feature-name>.test.ts`
- CLI wiring: Add route in `src/cli/program/routes.ts`

**New Channel Plugin:**
- Primary code: `extensions/<channel-id>/src/`
- Plugin manifest: `extensions/<channel-id>/openclaw.plugin.json`
- Package: `extensions/<channel-id>/package.json`
- Tests: `extensions/<channel-id>/src/**/*.test.ts`

**New Provider Plugin:**
- Primary code: `extensions/<provider-id>/src/`
- Plugin manifest: `extensions/<provider-id>/openclaw.plugin.json`
- Package: `extensions/<provider-id>/package.json`
- SDK usage: `openclaw/plugin-sdk/provider-setup.ts`, `openclaw/plugin-sdk/self-hosted-provider-setup.ts`

**New Shared Utility (infrastructure):**
- Pure utility: `src/infra/<utility-name>.ts`
- Feature utility: `src/<feature>/<utility-name>.ts`
- Tests: `src/infra/<utility-name>.test.ts` or colocated

**New Gateway Server Module:**
- Implementation: `src/gateway/<module-name>.ts`
- Tests: `src/gateway/<module-name>.test.ts`
- Types: `src/gateway/server-methods/types.ts` if exposing as RPC

**New UI Component:**
- Implementation: `ui/src/ui/components/<ComponentName>.ts`
- Tests: `ui/src/ui/components/<ComponentName>.test.ts`

**New Mobile Feature (Android):**
- Implementation: `apps/android/app/src/main/java/ai/openclaw/app/<FeatureName>.kt`
- Tests: `apps/android/app/src/test/java/ai/openclaw/app/`

**New Mobile Feature (iOS):**
- Implementation: `apps/ios/Sources/<Feature>/<FeatureName>.swift`
- Tests: `apps/ios/Tests/`

## Special Directories

**extensions/:**
- Purpose: All plugin packages (channels, providers, tools)
- Generated: No
- Committed: Yes (workspace packages)
- Note: Plugins are npm workspaces; install runs `npm install --omit=dev` in plugin dir

**src/plugin-sdk/:**
- Purpose: Public SDK surface for extension authors
- Generated: No (but API baseline checked: `pnpm plugin-sdk:api:gen/check`)
- Committed: Yes
- Note: `src/plugin-sdk/index.ts` re-exports types; subpath modules are the canonical contract

**vendor/:**
- Purpose: Vendored third-party code (a2ui specification and renderers)
- Generated: Partially (spec artifacts)
- Committed: Yes (with exception rules)

**docs/:**
- Purpose: Mintlify documentation
- Generated: `docs/zh-CN/` is generated from English docs
- Committed: Yes

**.planning/:**
- Purpose: Planning artifacts for GSD workflow
- Generated: Written by GSD agents
- Committed: Yes (`.planning/` is tracked in git)

**ui/src/i18n/locales/:**
- Purpose: Translation files for web UI
- Generated: `zh-CN` and `zh-TW` are generated via `scripts/docs-i18n`
- Committed: Yes (glossary: `docs/.i18n/glossary.zh-CN.json`)

---

*Structure analysis: 2026-03-27*
