# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Plugin-based multi-channel AI gateway with an ACP (Agent Communication Protocol) message bus at its core.

**Key Characteristics:**
- Gateway-centric: All channels and agents communicate through a central WebSocket gateway server
- Plugin-based channels: Messaging channels live as isolated workspace packages under `extensions/*`, loaded dynamically
- ACP as RPC/message layer: ACP handles session identity, event mapping, translation, and protocol-level concerns
- ACP spawn for isolation: Long-running agent work runs in ACP subprocesses, keeping the gateway responsive
- Lazy CLI: Commander-based CLI with lazy command registration to avoid loading heavy modules on `--help`
- Typed TypeScript throughout: Strict typing, no `any`, TypeScript ESM

## Layers

**CLI Entry:**
- Purpose: Command-line interface entry point, handles argv routing, container targets, profile env
- Location: `src/entry.ts`, `src/cli/run-main.ts`
- Contains: Process bootstrap, argv normalization, respawn logic, global error handlers
- Depends on: `src/infra/env`, `src/infra/is-main`, `src/infra/unhandled-rejections`
- Used by: `openclaw.mjs` (root wrapper), `openclaw.pkg` (pkg binary)

**CLI Program:**
- Purpose: Builds the Commander program, registers all subcommands lazily
- Location: `src/cli/route.ts`, `src/cli/program/routes.ts`
- Contains: `tryRouteCli()`, `buildProgram()` in `src/cli/program/program.ts`
- Depends on: `src/commands/` (all command implementations)
- Used by: `src/cli/run-main.ts`

**Commands:**
- Purpose: All user-facing CLI commands (agent, channels, configure, doctor, onboard, etc.)
- Location: `src/commands/`
- Contains: `agent.ts`, `agents.ts`, `channels.ts`, `configure.ts`, `doctor.ts`, `onboard.ts`, `status.ts`, `sessions.ts`, `message.ts`, `backup.ts`, etc.
- Depends on: `src/gateway/`, `src/config/`, `src/plugins/`, `src/cli/deps.ts`
- Used by: CLI program

**Gateway Server:**
- Purpose: Central server that manages WebSocket connections from clients (CLI, mobile apps, web UI), routes messages to channel plugins, orchestrates agent runs
- Location: `src/gateway/server/server.impl.ts`, `src/gateway/server.ts`
- Contains: HTTP server, WebSocket handler, session management, plugin bootstrap, node registry, hook runner, cron service, control UI
- Depends on: `src/plugins/`, `src/acp/`, `src/channels/`, `src/agents/`, `src/config/`
- Used by: CLI (`openclaw gateway run`), macOS menubar app

**Gateway Client:**
- Purpose: WebSocket client used by CLI commands, mobile apps, and web UI to connect to the gateway
- Location: `src/gateway/client.ts`
- Contains: `GatewayClient` class, request/response framing, event dispatch, reconnect backoff
- Used by: `src/commands/` (status, health, agent, message), mobile app transport, web UI

**ACP (Agent Communication Protocol):**
- Purpose: Protocol layer for agent-to-gateway communication, session identity, event mapping, translation
- Location: `src/acp/`
- Subdirs: `client.ts`, `server.ts`, `session.ts`, `session-mapper.ts`, `event-mapper.ts`, `translator.ts`, `control-plane/`, `runtime/`
- Depends on: `@agentclientprotocol/sdk`
- Used by: Gateway server (server side), CLI agent commands (client side)

**Plugin System:**
- Purpose: Loads, validates, and runs workspace plugin packages from `extensions/*`
- Location: `src/plugins/`
- Key files: `loader.ts`, `registry.ts`, `runtime/`, `discovery.ts`, `bundled/`, `install.ts`, `update.ts`, `provider-runtime.ts`, `hook-runner-global.ts`, `bundle-mcp.ts`, `bundle-commands.ts`
- Depends on: `src/config/`, `src/gateway/server-methods/`, `src/plugin-sdk/`
- Used by: Gateway server at startup

**Plugin SDK:**
- Purpose: Public-facing TypeScript API surface for extension authors
- Location: `src/plugin-sdk/index.ts`, `src/plugin-sdk/*.ts`
- Contains: `core.ts`, `channel-runtime.ts`, `channel-setup.ts`, `agent-runtime.ts`, `gateway-runtime.ts`, `hook-runtime.ts`, `infra-runtime.ts`, `media-runtime.ts`, `conversation-runtime.ts`, etc. (50+ subpath exports)
- Depends on: Core types, no `src/` internals
- Used by: `extensions/*` packages exclusively

**Channel Plugins (extensions/):**
- Purpose: Messaging channel implementations (Telegram, WhatsApp, Discord, Slack, iMessage, Signal, etc.)
- Location: `extensions/*/src/` (~70 workspace packages)
- Each has: `runtime.ts` (runtime entry), `setup.ts` (setup entry), `channel.ts`, `config-schema.ts`, `monitor.ts`/`send.ts`, `types.ts`, `config-apply.ts`
- Depends on: `openclaw/plugin-sdk/*` (public SDK only)
- Used by: Gateway server via plugin loader

**Agents:**
- Purpose: Agent runtime, session management, auth profiles, subagent registry, Pi embedded runner
- Location: `src/agents/`
- Key files: `agent.ts`, `auth-profiles.ts`, `agent-scope.ts`, `cli-runner.ts`, `pi-embedded-runner/`, `skills/`, `acp-spawn.ts`
- Depends on: `src/acp/`, `src/config/sessions/`, model providers
- Used by: Gateway server, CLI agent commands

**Config:**
- Purpose: Configuration loading, validation, session store paths, CLI defaults, plugin config state
- Location: `src/config/`
- Key files: `config.ts`, `config-schema.ts`, `sessions.ts`, `sessions/paths.ts`, `sessions/session-key.ts`, `sessions/store.ts`, `channel-configured.ts`
- Depends on: `src/routing/`
- Used by: Gateway server, CLI commands, plugin loader

**Routing:**
- Purpose: Session key normalization, account lookup, reply routing
- Location: `src/routing/`
- Contains: `session-key.ts`, `account-id.ts`, `account-lookup.ts`, `bindings.ts`
- Depends on: `src/channels/`, `src/sessions/`
- Used by: Gateway server, CLI commands, channel plugins

**Sessions:**
- Purpose: Session store, lifecycle events, transcript handling, session key utilities
- Location: `src/config/sessions/` (session store) + `src/sessions/`
- Key files: `store.ts`, `session-key-utils.ts`, `transcript-events.ts`, `session-lifecycle-state.ts`
- Depends on: `src/config/`, `src/routing/`
- Used by: Gateway server, agents, CLI

**Channels (shared):**
- Purpose: Shared channel logic independent of any specific plugin (allowlists, mention gating, model overrides, command gating, etc.)
- Location: `src/channels/`
- Subdirs: `plugins/` (plugin contracts, registry, binding registry), `allowlists/`, `plugins/contracts/`, `plugins/binding-types.ts`
- Depends on: `src/plugins/`, `src/routing/`
- Used by: Gateway server, channel plugins

**Infra:**
- Purpose: Shared infrastructure utilities
- Location: `src/infra/`
- Subdirs: `fs-safe.js`, `ports.js`, `binaries.js`, `bonjour.js`, `net/ssrf.js`, `net/fetch-guard.js`, `device-identity.js`, `device-auth-store.js`, `tls/`, `archive.js`, `tmp-openclaw-dir.js`, `env.js`, `runtime-guard.js`, `path-env.js`
- Depends on: Node.js builtins, no core deps
- Used by: All layers

**Media Pipeline:**
- Purpose: Media fetch, storage, MIME detection, HEIC conversion, PDF extraction, ffmpeg exec, local media access
- Location: `src/media/`
- Contains: `fetch.ts`, `store.ts`, `mime.ts`, `image-ops.ts`, `ffmpeg-exec.ts`, `input-files.ts`, `web-media.ts`, `server.ts`
- Depends on: `src/infra/`, `src/routing/`
- Used by: Channel plugins, agent tools

**Auto-Reply:**
- Purpose: Reply dispatch, templating, draft stream
- Location: `src/auto-reply/`
- Contains: `reply.runtime.ts`, `templating.ts`, `draft-stream-loop.ts`
- Used by: Gateway server, CLI

**Hooks:**
- Purpose: Global hook runner for before/after agent events, message hooks, tool call hooks
- Location: `src/plugins/hook-runner-global.ts`, `src/plugins/hooks-mapping.ts`, `src/plugins/hooks-policy.ts`
- Used by: Gateway server

**Control UI:**
- Purpose: Embedded HTTP server that serves the web-based control UI
- Location: `src/gateway/control-ui.ts`, `src/infra/control-ui-assets.ts`
- Used by: Gateway server

**Web UI (ui/):**
- Purpose: Lit-based web application served by the gateway's control UI
- Location: `ui/src/`
- Key files: `main.ts`, `ui/app.ts`, `ui/app-gateway.ts`, `ui/app-chat.ts`, `ui/app-settings.ts`, `ui/controllers/chat.ts`, `ui/controllers/agents.ts`, `ui/controllers/channels.ts`, `ui/i18n/`
- Depends on: Lit, marked, dompurify, @noble/ed25519
- Used by: Browser clients connecting to gateway

**Native Mobile Apps:**
- Purpose: Mobile companion apps (Android Kotlin, iOS Swift, macOS app)
- Location: `apps/android/`, `apps/ios/`, `apps/macos/`
- Key patterns:
  - Android: `MainActivity.kt` + `MainViewModel.kt` (MVVM, Compose UI), `NodeApp.kt`, `NodeForegroundService.kt`
  - iOS: `OpenClawApp.swift` (`@MainActor @Observable` SwiftUI app with `NodeAppModel`)
  - macOS: `apps/macos/Sources/OpenClaw/` (AppKit/SwiftUI app with CanvasManager, GatewayProcessManager, etc.)
  - Both connect to gateway via `GatewayNodeSession` (iOS) / gateway protocol (Android)
  - `NodeApp` (Android) / `NodeRuntime` (Android) / `NodeForegroundService` handle device capabilities (camera, SMS, location, notifications)
- Used by: Mobile users as gateway-connected clients

## Data Flow

**Gateway startup:**
1. `openclaw gateway run` CLI command
2. `src/gateway/server/server.impl.ts:startGatewayServer()` runs
3. Config loaded from `~/.openclaw/`
4. Plugin loader (`src/plugins/loader.ts`) discovers and loads enabled plugins from `extensions/*`
5. Channel plugins bootstrap via their `runtime.ts` entries
6. Gateway WebSocket/HTTP server starts on configured port (default 18789)
7. Bonjour/mDNS announces gateway on local network

**Message flow (inbound):**
1. Channel plugin receives message (e.g., Telegram webhook, Discord event, WhatsApp Web)
2. Plugin normalizes message to internal format (`InboundEnvelope`/`InboundReplyDispatch`)
3. Plugin calls `channel.receiveMessage()` on the plugin runtime
4. Gateway session lookup via `src/routing/session-key.ts`
5. Message stored in session transcript
6. Agent run triggered (ACP spawn subprocess or inline)
7. Agent responds (model API call)
8. Reply routed back through channel plugin's `sendMessage()` / `sendReaction()`
9. Channel plugin delivers to messaging platform

**Message flow (outbound/CLI):**
1. CLI command calls `src/gateway/client.ts` (WebSocket)
2. Client sends message to gateway
3. Gateway routes to agent or session
4. Response sent back via WebSocket

**Agent run (ACP spawn):**
1. Gateway spawns ACP subprocess (`src/acp/control-plane/spawn.ts`)
2. ACP subprocess runs `src/acp/control-plane/manager.ts`
3. Manager runs agent loop with model API calls
4. Events streamed back to gateway via `AgentSideConnection` (from `@agentclientprotocol/sdk`)

## Key Abstractions

**GatewayClient:**
- Purpose: WebSocket client for connecting to a running gateway
- Location: `src/gateway/client.ts`
- Examples: Used by all CLI commands that talk to gateway, mobile app transport
- Pattern: Class with `start()`, `stop()`, `request()`, `onEvent()` methods

**PluginRegistry:**
- Purpose: Central registry of all loaded plugins
- Location: `src/plugins/registry.ts`
- Pattern: `createPluginRegistry()`, `setActivePluginRegistry()`
- Exposes: `plugins[]`, `channels[]`, `providers[]`

**PluginRuntime:**
- Purpose: Runtime interface available to plugins at runtime
- Location: `src/plugins/runtime/types.ts`, created in `src/plugins/runtime/index.ts`
- Exposed via: `openclaw/plugin-sdk/*` subpaths
- Key slices: `version`, `config`, `agent`, `channel`, `logging`, `state`, `modelAuth`

**ChannelPlugin:**
- Purpose: Interface implemented by each channel extension
- Location: `src/channels/plugins/types.ts`
- Pattern: Object with `id`, `meta`, `setup()`, `runtime()`, `configSchema()`

**GatewayServer:**
- Purpose: The main gateway server class
- Location: `src/gateway/server/server.impl.ts`
- Exported from: `src/gateway/server.ts`
- Key methods: `start()`, `stop()`, handles all WS connections

**AgentRuntime:**
- Purpose: Interface for agent execution
- Location: `src/agents/` (scattered across multiple files), `src/plugin-sdk/agent-runtime.ts`
- Pattern: ACP spawn, auth profiles, session isolation

**AcpGatewayAgent (translator):**
- Purpose: Bridge between gateway and ACP subprocess
- Location: `src/acp/translator.ts`
- Pattern: Converts gateway events to/from ACP protocol

## Entry Points

**Root CLI entry:**
- Location: `openclaw.mjs`
- Triggers: `openclaw <command>`
- Responsibilities: Minimal wrapper, sets process title, respawns if needed

**Core CLI entry (dev):**
- Location: `src/entry.ts`
- Triggers: `node dist/entry.js` or via `openclaw.mjs`
- Responsibilities: Respawn logic, `--version` fast path, container target detection

**CLI main:**
- Location: `src/cli/run-main.ts`
- Triggers: After entry bootstrap
- Responsibilities: `runCli()` - argv parsing, container/container-target, CLI path, command routing, program building

**Gateway server:**
- Location: `src/gateway/server/server.impl.ts` (`startGatewayServer()`)
- Triggers: `openclaw gateway run` CLI command
- Responsibilities: Full gateway startup - plugins, channels, HTTP/WS server, node registry

**Control UI web app:**
- Location: `ui/src/main.ts`
- Triggers: Built by Vite, served by gateway's control UI HTTP server
- Responsibilities: Lit web components for gateway control, chat, settings

**Android app:**
- Location: `apps/android/app/src/main/java/ai/openclaw/app/MainActivity.kt`
- Triggers: App launch
- Responsibilities: Compose UI, `MainViewModel` (MVVM), connects to gateway via protocol

**iOS app:**
- Location: `apps/ios/Sources/OpenClawApp.swift`
- Triggers: App launch
- Responsibilities: SwiftUI app, `NodeAppModel` (`@Observable`), connects to gateway via `GatewayNodeSession`

**macOS app:**
- Location: `apps/macos/Sources/OpenClaw/` (SwiftUI/AppKit)
- Triggers: App launch
- Responsibilities: Menubar app, `GatewayProcessManager`, CanvasManager, `ChannelsStore`

## Error Handling

**Strategy:** Layered - global handlers at entry, typed errors at each layer, result objects for recoverable failures.

**Patterns:**
- Global unhandled rejection handler: `src/infra/unhandled-rejections.ts` installed at entry
- Typed error classes: `src/acp/runtime/errors.ts`, `src/infra/errors.ts`
- Result objects: `{ ok: true, value } | { ok: false, error: string }` for parse/validation
- ACP error text: `src/acp/runtime/error-text.ts` maps error codes to user-facing strings
- Gateway close codes: `GATEWAY_CLOSE_CODE_HINTS` in `src/gateway/client.ts`

## Cross-Cutting Concerns

**Logging:** `src/logging/subsystem.ts` (`createSubsystemLogger`), tagged subsystems (gateway, plugins, channels, etc.), structured output with console capture

**Validation:** `src/config/config-schema.ts` for config, `src/plugins/schema-validator.ts` for plugin manifests, `src/channels/plugins/contracts/` for channel contracts

**Authentication:** Auth profiles in `src/agents/auth-profiles.ts`, device auth in `src/infra/device-auth-store.ts`, gateway auth in `src/gateway/connection-auth.ts`

**Secrets:** `src/secrets/` - command secrets, runtime secrets snapshot, gateway auth surfaces

**i18n:** `ui/src/i18n/` - Lit-based translation system with locale registries (`en`, `de`, `es`, `pt-BR`, `zh-CN`, `zh-TW`)

**SSRF protection:** `src/infra/net/ssrf.ts` - hostname allowlist, pinned dispatcher policy

**Archive/backup:** `src/infra/archive.ts`, `src/gateway/session-archive.fs.ts`

---

*Architecture analysis: 2026-03-27*
