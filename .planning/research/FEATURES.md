# Feature Landscape: Desktop AI Assistants

**Domain:** Personal AI Assistant / Multi-Agent Desktop Application
**Researched:** 2026-03-28
**Confidence:** MEDIUM (based on training data; recommend verification with current market analysis)

---

## Table Stakes

Features users expect from any desktop AI assistant in 2025. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-provider LLM support** | Users have preferences (Claude, GPT, local models); lock-in is unacceptable | Medium | Must support: Anthropic, OpenAI, Ollama/local as baseline |
| **Chat interface with history** | Core interaction model; users expect threaded conversations | Low | Persistent, searchable, exportable |
| **File attachment/upload** | AI needs context from documents, images, code | Low | Drag-drop, clipboard paste, file picker |
| **Code-aware interactions** | Desktop assistants are heavily used for coding tasks | Medium | Syntax highlighting, file tree context, project awareness |
| **Tool use / Function calling** | AI must interact with external systems (files, APIs, commands) | Medium | MCP protocol becoming standard |
| **Dark/light mode** | Basic accessibility and user preference | Low | System-aware default |
| **Keyboard shortcuts** | Power users expect efficiency | Low | Global hotkey to summon, cmd+k for commands |
| **Local data storage** | Privacy expectation for desktop apps | Low | SQLite or file-based, user-controlled location |
| **Auto-update mechanism** | Security and feature freshness | Medium | Check + prompt, not silent auto-update |

### Table Stakes Analysis

These features define the "minimum viable product" for desktop AI assistants in 2025:

1. **Model flexibility is non-negotiable** — Users have strong preferences and often use multiple models for different tasks (Claude for reasoning, GPT-4 for speed, local models for privacy).

2. **Context is everything** — Without file uploads and project awareness, the assistant is just a chat wrapper.

3. **Tool use is the differentiator between toy and tool** — Function calling enables real work.

---

## Differentiators

Features that set products apart. Not universally expected, but create competitive advantage when done well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-agent orchestration** | Delegate complex tasks to specialized agent teams | High | ClawHive's core differentiator; few products do this well |
| **Hierarchical agent structure** | Clear responsibility lines, scalable delegation | High | CEO → Dept Heads → Team Leaders → Agents model |
| **Per-task security levels** | Different risk profiles for different tasks | Medium | Bank-level security as selling point |
| **Plan-first execution mode** | User approves plan before execution | Medium | Trust-building for autonomous actions |
| **Browser control / Web automation** | AI can interact with web apps, not just APIs | High | Playwright/Puppeteer integration |
| **Knowledge base integration** | Per-agent RAG from files, Notion, Obsidian | Medium | Makes agents truly specialized |
| **Skills/MCP marketplace** | Extensible capabilities via npm packages | Medium | Ecosystem play |
| **Team collaboration features** | Shared memory, selective conversation sharing | Medium | Enables multi-agent workflows |
| **Assessment/reporting** | Leaders review work, aggregate reports | Medium | Accountability in agent hierarchy |
| **Recurring/scheduled tasks** | Automation beyond one-off interactions | Medium | Cron-like scheduling |
| **Ambient visual feedback** | Glow/pulse during work, progress indicators | Low | Builds trust, shows activity |
| **Bilingual UI (i18n)** | Accessibility for non-English users | Low | English + Chinese baseline |
| **Portable installation** | Run from external drive, custom data path | Low | Privacy/power user feature |

### Differentiator Analysis

**High-Impact, Hard-to-Copy:**
- Multi-agent orchestration with hierarchy — requires significant architecture investment
- Per-task security with sandboxing — technical moat
- Plan-first mode — unique UX pattern that builds trust

**Medium-Impact, Expected Soon:**
- Browser control — becoming standard in coding assistants
- Knowledge base integration — RAG is commoditizing
- Skills marketplace — ecosystem play requiring network effects

**Low-Impact, Nice-to-Have:**
- Ambient glow — polish feature
- Bilingual UI — table stakes for global products
- Portable install — niche power user feature

---

## Anti-Features

Features to explicitly NOT build. Either harmful, out of scope, or better handled elsewhere.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Cloud sync of conversations** | Violates privacy-first promise; security risk | Local-only storage with user-controlled backup/export |
| **Silent auto-updates** | User should control when updates apply | Monthly check + prompt user |
| **Universal messaging integration** (WhatsApp, Telegram, Slack) | Scope creep; security nightmare | Focus on desktop assistant use case; messaging is v2+ |
| **Office suite integration** (Docs, Sheets, Slides) | Heavy maintenance; not core value | Use browser control + MCP for office tasks |
| **Mobile companion app** | Platform expansion before product-market fit | Nail desktop experience first |
| **Windows/Linux ports** | Fragmentation before validation | macOS-first, architecture for future ports |
| **Auto-allow sensitive operations** | Security risk; violates bank-level promise | Always block + ask; user-defined safe zones only |
| **Flat agent structure** | Doesn't scale; unclear responsibility | Hierarchical model from day one |
| **Real-time collaboration** (multiple users) | Personal assistant scope; adds complexity | Single-user with multi-agent delegation |

### Anti-Feature Rationale

1. **Cloud sync** — ClawHive's privacy-first positioning requires local-only data. Users who want cloud can use sync tools externally.

2. **Silent updates** — Bank-level security means user awareness of all changes. Prompted updates respect user agency.

3. **Messaging integrations** — Each messaging platform adds massive security surface area. Defer to v2+ when core product is validated.

4. **Office suite integration** — Better handled via browser automation (MCP/playwright) than native integrations. Avoids vendor lock-in.

5. **Multi-platform** — Electron enables cross-platform, but focus validation on macOS first. Don't dilute early feedback.

---

## Feature Dependencies

```
Multi-provider support
  → Model selection UI
  → API key management
  → Auto-fetch model lists (for custom providers)

Hierarchical agent system
  → Agent creation/management UI
  → Role-based permissions
  → Agent communication (top-down + team)
  → Assessment/reporting

Security framework
  → Per-task security levels
  → Privacy guard (path blocking)
  → Suspicious pattern detection
  → Sandboxed bridge

Knowledge bases
  → File/folder attachment
  → RAG pipeline
  → Notion/Obsidian connectors

Skills/MCP system
  → NPM skill installation
  → Skill loading per agent
  → MCP server management

Browser control
  → Playwright/Puppeteer integration
  → Browser extension
  → MCP browser tools
```

---

## Competitive Landscape Mapping

### Claude Code (Anthropic)
**Strengths:** Deep Claude integration, excellent tool use, agent framework
**Table Stakes:** Multi-model (limited), chat history, file upload, code awareness, tool use
**Differentiators:** Agent framework, excellent reasoning, /commands
**Gaps:** No visual GUI (terminal-only), no multi-agent orchestration, no hierarchical structure

### Cursor
**Strengths:** IDE integration, tab prediction, composer
**Table Stakes:** Multi-model, chat, file upload, code awareness, tool use
**Differentiators:** Native IDE experience, tab completion, composer for multi-file edits
**Gaps:** No multi-agent system, no hierarchical delegation, limited browser control

### Windsurf (Codeium)
**Strengths:** Cascade agent, collaborative AI
**Table Stakes:** Multi-model, chat, file upload, code awareness
**Differentiators:** Cascade for autonomous execution, collaborative agent experience
**Gaps:** No hierarchical structure, limited security controls

### OpenClaw (base for ClawHive)
**Strengths:** Multi-channel, plugin system, MCP support
**Table Stakes:** Multi-provider, tool use, skills
**Differentiators:** Gateway architecture, channel abstraction
**Gaps:** No GUI (CLI/gateway only), no hierarchical agents

### ClawHive Opportunity
**Unique positioning:** Hierarchical multi-agent + bank-level security + Electron GUI
**No direct competitor** combines all three elements.

---

## MVP Recommendation

### Phase 1: Foundation (Must Have)
1. **Electron GUI shell** — Dual-pane layout, dark/light mode
2. **Multi-provider LLM support** — Anthropic, OpenAI, Ollama minimum
3. **Basic chat interface** — History, file upload, model selection
4. **Single agent execution** — Tool use, file operations
5. **Local data storage** — Custom path, portable install
6. **Basic security** — Path blocking, permission prompts

### Phase 2: Multi-Agent Core
7. **Agent hierarchy** — Create agents with roles
8. **Top-down delegation** — CEO assigns to managers, etc.
9. **Team collaboration** — Shared context for sub-agents
10. **Plan-first mode** — Approve before execute
11. **Knowledge bases** — Per-agent file/folder attachments

### Phase 3: Advanced Features
12. **Skills/MCP system** — Install and load per agent
13. **Browser control** — Playwright integration
14. **Assessment reports** — Review and aggregate
15. **Recurring tasks** — Scheduling system
16. **Suspicious pattern detection** — Advanced security

### Defer to Post-MVP
- Messaging integrations (v2+)
- Office suite native integration (use browser)
- Mobile app (future)
- Windows/Linux ports (post-validation)
- Cloud sync (intentionally excluded)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table Stakes | HIGH | Well-established patterns in market |
| Differentiators | MEDIUM | Based on training data; verify current competitive landscape |
| Anti-Features | HIGH | Clear from project requirements |
| Dependencies | HIGH | Logical architecture analysis |
| Competitive Mapping | MEDIUM | Based on training data; recommend current product analysis |

---

## Gaps to Address

1. **Current competitive analysis** — Verify features of Claude Code, Cursor, Windsurf as of 2026
2. **User research** — Validate which differentiators actually matter to target users
3. **Security audit** — Verify "bank-level security" claims with actual security standards
4. **Performance benchmarks** — Multi-agent overhead vs single-agent performance
5. **MCP ecosystem status** — Verify which MCP servers are production-ready

---

## Sources

- Training data on Claude Code, Cursor, Windsurf, OpenClaw (confidence: MEDIUM)
- Project requirements from `.planning/PROJECT.md` (confidence: HIGH)
- General desktop AI assistant market knowledge (confidence: MEDIUM)

**Recommendation:** Validate competitive analysis with current product documentation before finalizing roadmap.
