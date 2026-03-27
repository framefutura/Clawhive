# External Integrations

**Analysis Date:** 2026-03-27

## AI/LLM Providers

**OpenAI:**
- SDK: `openai` (extension-provided, or via root AI layer)
- API Key env: `OPENAI_API_KEY`, `OPENAI_API_KEY_1`, `OPENAI_API_KEYS` (comma-separated), `OPENCLAW_LIVE_OPENAI_KEY`
- Extensions: `extensions/openai/`

**Anthropic:**
- SDK: `@anthropic-ai/sdk` (extension-provided); also `@anthropic-ai/vertex-sdk` 0.14.4 for Vertex AI
- API Key env: `ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEYS`, `OPENCLAW_LIVE_ANTHROPIC_KEY`
- Extensions: `extensions/anthropic/`, `extensions/amazon-bedrock/` (via Bedrock)

**Google (Gemini/GAI):**
- SDK: `google-auth-library` 10.6.2 (in `extensions/googlechat/`)
- API Key env: `GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEYS`, `OPENCLAW_LIVE_GEMINI_KEY`, `GOOGLE_API_KEY`
- Extensions: `extensions/google/`, `extensions/googlechat/`

**Amazon Bedrock:**
- SDK: `@aws-sdk/client-bedrock` 3.1018.0 (in root deps)
- Auth: AWS credentials chain (env `AWS_ACCESS_KEY_ID`, etc.)
- Extensions: `extensions/amazon-bedrock/`

**Other LLM Providers (all via extension packages):**
- `extensions/openai/` - OpenAI
- `extensions/anthropic/` - Anthropic
- `extensions/google/` - Google Gemini
- `extensions/amazon-bedrock/` - AWS Bedrock
- `extensions/mistral/` - Mistral
- `extensions/groq/` - Groq
- `extensions/ollama/` - Ollama (local)
- `extensions/vllm/` - vLLM
- `extensions/sglang/` - SGLang
- `extensions/deepseek/` - DeepSeek
- `extensions/moonshot/` - Moonshot
- `extensions/kimi-coding/` - Kimi
- `extensions/qianfan/` - Baidu Qianfan
- `extensions/byteplus/` - BytePlus
- `extensions/minimax/` - MiniMax
- `extensions/volcengine/` - VolcEngine
- `extensions/nvidia/` - NVIDIA NIM
- `extensions/litellm/` - LiteLLM proxy
- `extensions/openrouter/` - OpenRouter
- `extensions/perplexity/` - Perplexity AI
- `extensions/xai/` - xAI
- `extensions/venice/` - Venice AI
- `extensions/together/` - Together AI
- `extensions/huggingface/` - HuggingFace Inference
- `extensions/cloudflare-ai-gateway/` - Cloudflare AI Gateway
- `extensions/vercel-ai-gateway/` - Vercel AI Gateway
- `extensions/github-copilot/` - GitHub Copilot
- `extensions/acpx/` - AC PX
- `extensions/microsoft-foundry/` - Azure AI Foundry
- `extensions/chutes/` - Chutes
- `extensions/modelstudio/` - ModelStudio
- `extensions/synthetic/` - Synthetic (local Transformers)
- `extensions/kilocode/` - KiloCode
- `extensions/opencode/` - OpenCode
- `extensions/opencode-go/` - OpenCode Go

## Speech & Audio

**ElevenLabs:**
- API Key env: `ELEVENLABS_API_KEY` or `XI_API_KEY`
- Extensions: `extensions/elevenlabs/`

**Deepgram:**
- API Key env: `DEEPGRAM_API_KEY`
- Extensions: `extensions/deepgram/` (STT for media pipeline)

**Microsoft Speech:**
- SDK: `@microsoft/cognitiveservices-speech-sdk`
- Extensions: `extensions/microsoft/`

**Edge TTS:**
- SDK: `node-edge-tts` 1.2.10 (in root deps)

**OpenAI Whisper (STT):**
- Used by `extensions/voice-call/` for transcription

## Messaging Channels

**Slack:**
- SDK: `@slack/bolt` 4.6.0 + `@slack/web-api` 7.15.0
- Auth env: `SLACK_BOT_TOKEN` (`xoxb-...`), `SLACK_APP_TOKEN` (`xapp-...`)
- Extensions: `extensions/slack/`
- Protocol: Socket Mode

**Discord:**
- SDK: `discord.js` (installed as dependency of `extensions/discord/`)
- Auth env: `DISCORD_BOT_TOKEN`
- Extensions: `extensions/discord/`

**Telegram:**
- SDK: `grammy` (types in root `@grammyjs/types`)
- Auth env: `TELEGRAM_BOT_TOKEN`
- Extensions: `extensions/telegram/`

**Matrix:**
- SDK: `matrix-js-sdk` 41.2.0 + `@matrix-org/matrix-sdk-crypto-nodejs` 0.4.0 (E2EE)
- Extensions: `extensions/matrix/`

**WhatsApp:**
- SDK: `@whiskeysockets/baileys` 7.0.0-rc.9
- Extensions: `extensions/whatsapp/`
- Protocol: WhatsApp Web (QR link)

**Microsoft Teams:**
- SDK: `@microsoft/teams.api` 2.0.6 + `@microsoft/teams.apps` 2.0.6
- Extensions: `extensions/msteams/`

**LINE:**
- SDK: `@line/bot-sdk` 10.6.0 (in root deps)
- Core channel: `src/line/`

**Google Chat:**
- SDK: `google-auth-library` 10.6.2
- Extensions: `extensions/googlechat/`
- Protocol: HTTP webhooks

**iMessage:**
- Extension: `extensions/imessage/`

**Signal:**
- Extension: `extensions/signal/` (signal-cli)

**Zalo:**
- Extension: `extensions/zalo/`
- Auth env: `ZALO_BOT_TOKEN`

**Zalo User:**
- Extension: `extensions/zalouser/`

**Feishu (Lark):**
- Extension: `extensions/feishu/`
- Auth env: `FEISHU_APP_ID`, `FEISHU_APP_SECRET`

**Mattermost:**
- Auth env: `MATTERMOST_BOT_TOKEN`, `MATTERMOST_URL`
- Extension: `extensions/mattermost/`

**IRC:**
- Extension: `extensions/irc/`

**Nostr:**
- SDK: `nostr-tools` 2.23.3
- Extension: `extensions/nostr/`

**Synology Chat:**
- Extension: `extensions/synology-chat/`

**Nextcloud Talk:**
- Extension: `extensions/nextcloud-talk/`

**Tlon:**
- SDK: `@tloncorp/api`, `@tloncorp/tlon-skill`, `@aws-sdk/client-s3` (in `extensions/tlon/`)
- Storage: AWS S3

**Twitch:**
- Auth env: `OPENCLAW_TWITCH_ACCESS_TOKEN` (`oauth:...`)
- Extension: `extensions/twitch/`

## Voice Call

**Twilio:**
- SDK: Twilio SDK (imported in `extensions/voice-call/src/config.ts`)
- Auth env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Extension: `extensions/voice-call/`

**Telnyx:**
- Auth env: `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_PUBLIC_KEY`
- Extension: `extensions/voice-call/`

**Plivo:**
- Auth env: `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`
- Extension: `extensions/voice-call/`

**Tunnel/Ingress:**
- ngrok: env `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`
- Tailscale: built-in via `src/infra/tailscale.ts`

## Web Search & Data

**Firecrawl:**
- API Key env: `FIRECRAWL_API_KEY`
- Base URL env: `FIRECRAWL_BASE_URL` (default: `https://api.firecrawl.dev`)
- Extension: `extensions/firecrawl/`

**Tavily:**
- API Key env: `TAVILY_API_KEY`
- Extension: `extensions/tavily/`

**DuckDuckGo:**
- Extension: `extensions/duckduckgo/`

**Brave Search:**
- API Key env: `BRAVE_API_KEY`
- Extension: `extensions/brave/`

**Exa:**
- Extension: `extensions/exa/`

**Browser/Automation:**
- `playwright-core` 1.58.2 (in root deps + `extensions/diffs/`)
- Used for screenshot capture, diffing, and browsing

## Memory & Storage

**LanceDB (Vector DB):**
- SDK: `@lancedb/lancedb` 0.27.1 + `openai` for embeddings
- Extension: `extensions/memory-lancedb/`

**Memory Core:**
- Extension: `extensions/memory-core/`
- Storage: SQLite via `sqlite-vec` 0.1.7 (root deps)

## Data Storage

**Local SQLite:**
- Uses Node.js built-in `better-sqlite3` or equivalent (standard library)
- `sqlite-vec` 0.1.7 loaded as extension for vector search
- Sessions and state stored in `~/.openclaw/sessions/`

**File Storage:**
- Local filesystem (`~/.openclaw/credentials/` for web provider creds)
- S3-compatible via `@aws-sdk/client-s3` (for `extensions/tlon/`)

**Redis:**
- Not detected as a direct dependency

**No external SQL/NoSQL DBaaS** (state is local to the gateway instance)

## Authentication & Identity

**Custom Auth:**
- Gateway token: `OPENCLAW_GATEWAY_TOKEN` env or config
- Gateway password: `OPENCLAW_GATEWAY_PASSWORD` env or config
- No external auth provider (self-hosted identity)

**Channel Auth:**
- Bot tokens per channel (Discord, Slack, Telegram, etc.)
- OAuth flows for some channels (Google Chat via google-auth-library)

**Session Storage:**
- Sessions stored as JSONL files in `~/.openclaw/sessions/`
- No external session store

## Monitoring & Observability

**Error Tracking:**
- No Sentry or external error tracker detected in codebase

**Structured Logging:**
- `tslog` 4.10.2 (root deps) - structured JSON-like logging
- `src/logging/logger.ts` - main logger
- Gateway logs: `~/.openclaw/` directory

**Diagnostics:**
- `extensions/diagnostics-otel/` - OpenTelemetry support (optional)
- `extensions/acpx/` - AC PX diagnostics

**Health Checks:**
- Gateway health: `src/commands/doctor-gateway-health.ts`
- Status probing: `src/commands/status.gateway-probe.ts`

## CI/CD & Deployment

**Hosting:**
- macOS app (Sparkle auto-update) - `apps/macos/`
- Docker container - `Dockerfile`, `Dockerfile.sandbox*`
- Fly.io - `fly.toml`
- Render.com - `render.yaml`
- npm registry - CLI + plugin packages

**CI Pipelines:**
- GitHub Actions: `.github/workflows/` (ci.yml, ci-bun.yml, codeql.yml, macos-release.yml, docker-release.yml, npm-release workflows, etc.)
- CodeQL for security scanning
- Bun CI (`ci-bun.yml`) and Node CI (`ci.yml`)

**macOS Signing:**
- Sparkle framework for app updates
- Release signing credentials managed outside the repo (private maintainer docs)

## Environment Configuration

**Critical env vars (from `.env.example`):**

Gateway:
- `OPENCLAW_GATEWAY_TOKEN` - Gateway auth token
- `OPENCLAW_GATEWAY_PASSWORD` - Gateway auth password
- `OPENCLAW_STATE_DIR` - State directory (default: `~/.openclaw`)
- `OPENCLAW_CONFIG_PATH` - Config file path

Provider Keys:
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (+ `_1` / `_KEYS` variants)
- `OPENCLAW_LIVE_OPENAI_KEY`, `OPENCLAW_LIVE_ANTHROPIC_KEY`, `OPENCLAW_LIVE_GEMINI_KEY`

Channels:
- `TELEGRAM_BOT_TOKEN`
- `DISCORD_BOT_TOKEN`
- `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`
- `MATTERMOST_BOT_TOKEN`, `MATTERMOST_URL`
- `ZALO_BOT_TOKEN`
- `OPENCLAW_TWITCH_ACCESS_TOKEN`

Tools:
- `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`
- `ELEVENLABS_API_KEY` / `XI_API_KEY`, `DEEPGRAM_API_KEY`

Voice Call:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_PUBLIC_KEY`
- `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`
- `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`

Agent Client Protocol:
- MCP: `@modelcontextprotocol/sdk` 1.28.0
- Agent Client: `@agentclientprotocol/sdk` 0.17.0

**Secrets location:**
- Per-channel stored in `~/.openclaw/credentials/`
- Web provider creds: `~/.openclaw/credentials/`
- `.env` file at repo root or `~/.openclaw/.env`
- Channel tokens may also live in `openclaw.json` config

## Webhooks & Callbacks

**Inbound webhooks:**
- Gateway HTTP server receives events from channels
- Telegram: bot API polling/webhook
- Discord: Discord API events via WS
- Slack: Socket Mode (WebSocket-based)
- Matrix: Matrix client SDK (long-poll/polling)
- WhatsApp: Baileys SDK (Web-based)
- Voice call: Telnyx/Twilio/Plivo webhooks on local server
- Feishu: webhook endpoint
- Google Chat: HTTP webhook endpoint

**Outbound webhooks:**
- Custom outbound tool via `src/infra/outbound/outbound-session.ts`
- Agent client protocol MCP tools

---

*Integration audit: 2026-03-27*
