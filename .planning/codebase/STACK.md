# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript (ESM, strict mode) - All source code (`src/`, `extensions/`, `ui/`, `packages/`)

**Secondary:**
- Python 3.10+ - Docs i18n pipeline (`scripts/docs-i18n/`)

## Runtime

**Primary Runtime:**
- Node.js >=22.14.0 (CLI, gateway server, plugin runtime)

**Alternative Runtime:**
- Bun (used for dev, scripts, and local test execution via `bun <file.ts>` / `bunx`)

**Package Manager:**
- pnpm 10.32.1 (lockfile: `pnpm-lock.yaml`)
- Bun install is also supported but must stay in sync with pnpm-lock.yaml

## Core Frameworks

**Agent & AI:**
- `@mariozechner/pi-agent-core` 0.63.0 - Core agent runtime
- `@mariozechner/pi-ai` 0.63.0 - AI abstraction layer
- `@mariozechner/pi-coding-agent` 0.63.0 - Coding-specific agent
- `@mariozechner/pi-tui` 0.63.0 - Terminal UI components
- `@modelcontextprotocol/sdk` 1.28.0 - MCP client/server
- `@agentclientprotocol/sdk` 0.17.0 - Agent client protocol

**Server & HTTP:**
- `hono` 4.12.9 - Primary HTTP framework (gateway server)
- `express` 5.2.1 - Used in media pipeline (`src/media/server.ts`)
- `ws` 8.20.0 - WebSocket support (canvas-host, gateway)
- `undici` 7.24.6 - HTTP client (fetch wrapper)
- `gaxios` 7.1.4 - Google APIs HTTP client

**CLI & UI:**
- `commander` 14.0.3 - CLI argument parsing
- `@clack/prompts` 1.1.0 - TTY prompts and spinners
- `osc-progress` 0.3.0 - CLI progress indicators
- `chalk` 5.6.2 - Terminal color/style output
- `tslog` 4.10.2 - Structured logging
- `qrcode-terminal` 0.12.0 - Terminal QR code rendering

**Data & Config:**
- `zod` 4.3.6 - Schema validation
- `@sinclair/typebox` 0.34.48 - JSON Schema types
- `ajv` 8.18.0 - JSON Schema validation
- `yaml` 2.8.3 - YAML parsing
- `json5` 2.2.3 - JSON5 parsing
- `dotenv` 17.3.1 - Environment variable loading

**Media Processing:**
- `sharp` 0.34.5 - Image processing (server-side)
- `pdfjs-dist` 5.5.207 - PDF rendering
- `@mozilla/readability` 0.6.0 - HTML readability/parsing
- `linkedom` 0.18.12 - DOM parser (SSR fallback)
- `file-type` 22.0.0 - File type detection
- `playwright-core` 1.58.2 - Browser automation (for screenshot/diffs)

**AI/ML Models (root deps):**
- `@anthropic-ai/vertex-sdk` 0.14.4 - Anthropic via Google Vertex AI
- `@aws-sdk/client-bedrock` 3.1018.0 - AWS Bedrock
- `gaxios` 7.1.4 - Google API auth

**Database:**
- `sqlite-vec` 0.1.7 - SQLite vector extension for memory search
- `@lancedb/lancedb` 0.27.1 - Vector DB (via `extensions/memory-lancedb/`)
- LanceDB uses `openai` 6.x for embeddings

**Build & Dev Tools:**
- `tsx` 4.21.0 - TypeScript execution
- `tsdown` 0.21.5 - TypeScript bundler (CLI output)
- `vitest` 4.1.2 - Test runner
- `@vitest/coverage-v8` 4.1.2 - V8 coverage
- `typescript` 6.0.2 - TypeScript compiler
- `oxlint` 1.57.0 - Linter
- `oxfmt` 0.42.0 - Code formatter
- `oxlint-tsgolint` 0.17.4 - TypeScript-over-TSGO linter bridge
- `jiti` 2.6.1 - TypeScript/native module loader for CLI
- `jsdom` 29.0.1 - DOM environment for tests

**UI Framework:**
- `lit` 3.3.2 - Web components (control UI)
- `vite` 8.0.3 - UI build tool
- `@vitest/browser-playwright` 4.1.2 - Browser testing

**Native Modules (native addons, built at install):**
- `@lydell/node-pty` 1.2.0-beta.3 - PTY (terminal)
- `@matrix-org/matrix-sdk-crypto-nodejs` 0.4.0 - Matrix E2EE
- `sharp` 0.34.5 - Native image processing
- `node-llama-cpp` 3.18.1 - Local LLM inference (peer, optional)
- `@napi-rs/canvas` 0.1.89 - Canvas rendering (peer, optional)
- `authenticate-pam` - PAM auth

## Extension-Specific Notable Dependencies

**Messaging Channels (extension packages):**
- `@slack/bolt` 4.6.0 - Slack SDK (`extensions/slack/`)
- `matrix-js-sdk` 41.2.0 - Matrix client (`extensions/matrix/`)
- `@whiskeysockets/baileys` 7.0.0-rc.9 - WhatsApp (`extensions/whatsapp/`)
- `grammy` (3.x types) - Telegram (`extensions/telegram/`)
- `@line/bot-sdk` 10.6.0 - LINE Messaging (`extensions/line/`)
- `@microsoft/teams.api` 2.0.6 - MS Teams (`extensions/msteams/`)
- `google-auth-library` 10.6.2 - Google Chat auth (`extensions/googlechat/`)
- `nostr-tools` 2.23.3 - Nostr protocol (`extensions/nostr/`)
- `discord.js` (core Discord SDK - `extensions/discord/`)

**Speech & Voice:**
- `node-edge-tts` 1.2.10 - Edge TTS
- `@deepgram/sdk` - Deepgram STT (`extensions/deepgram/`)
- ElevenLabs, Azure Speech, OpenAI Whisper - via SDKs

**Tools & Search:**
- `firecrawl` SDK - Web scraping/fetching (`extensions/firecrawl/`)
- `tavily` SDK - Search API (`extensions/tavily/`)
- `duckduckgo` - Search (`extensions/duckduckgo/`)
- `brave-search` - Search (`extensions/brave/`)
- `exacategory` - Search (`extensions/exa/`)
- `playwright-core` - Browser automation (`extensions/diffs/`)
- `@xenova/transformers` - Local ML inference (`extensions/synthetic/`)

**AI Providers (extension packages):**
- OpenAI, Anthropic, Google Generative AI, Mistral, Groq, Ollama, vLLM, SGLang, Together AI, HuggingFace, Azure OpenAI, Amazon Bedrock, Cloudflare AI Gateway, Vercel AI Gateway, DeepSeek, Moonshot, Kimi, Qianfan, BytePlus, Minimax, VolcEngine, NVIDIA NIM, Groq, LiteLLM, OpenRouter, Perplexity, xAI, Venice AI

## Configuration

**TypeScript:**
- `tsconfig.json` - Root config at repo root; `module: "NodeNext"`, `target: "ES2023"`, `strict: true`
- Path aliases: `openclaw/plugin-sdk` -> `src/plugin-sdk/index.ts`, `openclaw/plugin-sdk/*` -> `src/plugin-sdk/*.ts`

**Build:**
- `vitest.config.ts` - Vitest config; `pool: "forks"`, V8 coverage thresholds 70%/55%/70%/70%
- `tsdown.config.ts` - TSDown CLI bundler
- `vite` config in `ui/` - Vite 8 for control UI build

**Linting/Formatting:**
- `oxlint` + `oxfmt` (Ox toolchain) - no separate ESLint/Prettier
- pnpm `overrides` block enforces exact dependency versions

**Environment Config:**
- `.env.example` at repo root - documents all supported env vars
- Env precedence (high -> low): process env > `./.env` > `~/.openclaw/.env` > `openclaw.json` `env` block

## Platform Requirements

**Development:**
- Node.js 22+ ( Bun also supported)
- pnpm 10.32.1
- macOS/Linux/Windows (CI tests all three)

**Production:**
- Node.js 22+ runtime
- Optional: native addon build tools for `@lydell/node-pty`, `sharp`, etc.
- SQLite (via Node.js built-in) + `sqlite-vec` extension
- Optional: Python 3.10+ for docs i18n pipeline

**Deployment Targets:**
- macOS app (Sparkle)
- Docker (multi-stage Dockerfile)
- Fly.io (via `fly.toml`)
- Render.com (via `render.yaml`)
- npm packages (CLI + plugin SDK)

---

*Stack analysis: 2026-03-27*
