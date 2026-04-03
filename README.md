# 🦞 Clawhive — Privacy-First Personal AI Assistant

<p align="center">
  <strong>Your AI. Your Data. Your Control. 🦞</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**Clawhive** is a privacy-first personal AI assistant powered by the [OpenClaw SDK](https://docs.openclaw.ai/plugins/sdk-overview). It runs as a native macOS app (`.dmg`), bringing OpenClaw's full multi-channel AI assistant capabilities — Telegram, WhatsApp, Discord, Slack, Signal, iMessage, and 20+ more — with enterprise-grade security controls baked in.

Built on OpenClaw's plugin architecture, Clawhive ships with a hardened security layer: financial crime detection, IP exposure protection, tool access controls, and real-time security alerting. Your API keys, conversation history, and data stay on your infrastructure.

## Features

### OpenClaw Core (Powered by OpenClaw SDK)
- **20+ Messaging Channels** — Telegram, WhatsApp, Discord, Slack, Signal, iMessage, BlueBubbles, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, WeChat, and more
- **Voice & Canvas** — Speak, listen, and control a live Canvas UI on macOS/iOS/Android
- **Subagent Orchestration** — Spawn parallel AI agents to handle complex multi-step tasks
- **Plugin Ecosystem** — Full compatibility with OpenClaw plugins, Codex/Claude/Cursor-compatible bundles, and the OpenClaw SDK
- **Model Flexibility** — Connect to OpenAI, Anthropic, Google, Azure, local LLMs, and 50+ providers
- **Skills System** — Extend capabilities with skills, slash commands, and webhooks
- **CLI & Gateway** — `openclaw` CLI and local gateway daemon for full control

### Privacy & Security (Clawhive)
- **Financial Crime Detection** — Built-in signals for gambling, money laundering, and suspicious financial tool usage. Blocks `crypto_transfer`, `payment_process`, `bank_transfer`, and `gift_card` tools at all security levels
- **IP Exposure Protection** — Detects and blocks IP lookup commands, network scanning tools, and VPN detection attempts. Protects your network identity from being leaked
- **Tool Access Controls** — Configurable global `toolBlacklist` and `toolWhitelist` with IPC-based management. Fine-grained control over what tools the assistant can invoke
- **Security Alert System** — Real-time alerts for credential access attempts, financial crime, and IP exposure events. Renderer receives alerts via secure IPC
- **Privacy Guard** — Multi-layered signal detection with configurable blocking policies across all security levels

### OpenClaw SDK
Clawhive is built natively on the **OpenClaw Plugin SDK** — the same SDK powering OpenClaw itself. This means:
- Full plugin compatibility with the OpenClaw ecosystem
- Native support for Codex/Claude/Cursor-compatible plugin bundles
- Enterprise integration via webhooks, OAuth, and CLI-first automation
- Extensible channel, provider, tool, and skill system
- Channel plugin SDK, skill SDK, and runtime API all fully supported

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Clawhive App                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  OpenClaw SDK Layer                   │  │
│  │  Channel Plugins  ·  Skill SDK  ·  Runtime API       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  Channel   │  │   Agent    │  │    Plugin       │    │
│  │  Plugins   │  │  Runtime   │  │    System       │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
│         │                │                    │              │
└─────────┼────────────────┼────────────────────┼──────────────┘
          │                │                    │
┌─────────┼────────────────┼────────────────────┼──────────────┐
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │           Privacy & Security Layer                   │     │
│  │  • Financial Crime Detection                         │     │
│  │  • IP Exposure Protection                            │     │
│  │  • Tool Access Controls (Blacklist/Whitelist)       │     │
│  │  • Security Alert System                             │     │
│  └─────────────────────────────────────────────────────┘     │
│                      Clawhive Gateway                        │
└─────────────────────────────────────────────────────────────┘
```

## Security Levels

Clawhive supports four configurable security levels that control which signals and tools are blocked:

| Level | Financial Crime | IP Exposure | Restricted Tools |
|-------|----------------|-------------|------------------|
| `off` | Monitored | Monitored | Blocked |
| `low` | Monitored | Monitored | Blocked |
| `medium` | Blocked | Blocked | Blocked |
| `high` | Blocked | Blocked | Blocked |

## Enterprise & Self-Hosting

Clawhive is designed for self-hosting. Your API keys, conversation history, and sensitive data never leave your infrastructure. Deploy on-premises or in your private cloud — no cloud dependency required.

## Documentation

- [OpenClaw Docs](https://docs.openclaw.ai) — Full documentation for the base platform
- [OpenClaw SDK](https://docs.openclaw.ai/plugins/sdk-overview) — Plugin SDK guide
- [Plugins](https://docs.openclaw.ai/tools/plugin) — Plugin system and bundle format
- [Channels](https://docs.openclaw.ai/channels) — Channel setup guides
- [Skills](https://docs.openclaw.ai/skills) — Skill creation and management

## License

MIT — same as OpenClaw. See [LICENSE](LICENSE).

---

*Clawhive is a privacy-focused fork of [OpenClaw](https://github.com/openclaw/openclaw). Built with the OpenClaw SDK.*
