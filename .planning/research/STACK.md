# Stack Research: Desktop Multi-Agent AI Assistant

**Domain:** Desktop Multi-Agent AI Assistant (ClawHive)
**Researched:** 2026-03-28
**Confidence:** MEDIUM (based on training data + OpenClaw SDK analysis)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Node.js** | 22 LTS | Runtime environment | Native ESM, async performance, OpenClaw SDK compatibility |
| **TypeScript** | 5.x | Programming language | Strong typing for complex multi-agent logic, SDK compatibility |
| **Electron** | 33+ | Desktop framework | Cross-platform, Node integration, security patches |
| **React** | 18.3+ | Frontend framework | Largest ecosystem, component reuse, TypeScript native |
| **OpenClaw SDK** | latest | Agent framework | Proven agent/skill/MCP infrastructure, peer communication |
| **better-sqlite3** | 11.x | Local database | Zero-config, synchronous API, encrypted at rest |
| **pnpm** | 9.x | Package manager | Workspace support for monorepo, efficient deps, matches OpenClaw |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Zustand** | 4.5+ | State management | Lightweight, TypeScript-first, agent state tracking |
| **Tailwind CSS** | 3.4+ | Styling | Utility-first, rapid prototyping, dark/light mode |
| **shadcn/ui** | latest | UI components | Accessible, customizable, Tailwind native |
| **electron-store** | 8.x | Config persistence | Encrypted storage for user preferences |
| **electron-builder** | 25.x | Distribution | DMG packaging, code signing, notarization |
| **@anthropic-ai/sdk** | 0.39+ | Claude integration | Native streaming, tool use, Claude models |
| **openai** | 4.x | GPT integration | Function calling, streaming, GPT models |
| **vitest** | 3.x | Unit testing | Fast, Vite-native, TypeScript-first |
| **Playwright** | 1.x | E2E testing | Electron support, visual testing |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vite** | Build/bundler | Fast HMR, native Electron plugin |
| **ESLint** | Linting | TypeScript-aware with typescript-eslint |
| **Prettier** | Formatting | Consistent code style |
| **oxlint** | Fast linting | Alternative to ESLint for speed (used in OpenClaw) |

---

## Installation

```bash
# Initialize project
mkdir clawhive && cd clawhive
pnpm init

# Core dependencies
pnpm add electron@33 better-sqlite3@11 electron-store@8 zustand@4 react@18 react-dom@18

# AI providers
pnpm add @anthropic-ai/sdk openai

# OpenClaw SDK (as library)
pnpm add openclaw

# Dev dependencies
pnpm add -D typescript@5 vite@6 vitest@3 @playwright/test electron-builder@25
pnpm add -D eslint@9 prettier@3 @types/better-sqlite3 @types/node@22 @types/react@18

# UI
pnpm add tailwindcss@3 @tanstack/react-query
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Electron** | Tauri | If bundle size is critical and Rust expertise exists |
| **React** | Vue 3 | If team has Vue expertise and prefers simpler mental model |
| **React** | Svelte | If smallest bundle and fastest runtime are priorities |
| **Zustand** | Redux Toolkit | If team prefers Redux patterns and time-travel debugging |
| **Zustand** | Jotai | If atomic state model fits the use case better |
| **SQLite** | IndexedDB | If pure browser storage is needed (no Node.js) |
| **pnpm** | Bun | If faster installs are needed and lockfile migration is acceptable |
| **vitest** | Jest | If existing Jest expertise and snapshots are critical |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Tauri 1.x** | Immature ecosystem, Rust learning curve, limited npm compatibility | Electron 33+ |
| **Webpack** | Slow builds, complex config compared to Vite | Vite 6+ |
| **Redux (plain)** | Boilerplate overkill for desktop app state | Zustand |
| **CRA (create-react-app)** | Deprecated, no maintenance | Vite + React plugin |
| **NeDB / PouchDB** | Abandoned, performance issues | better-sqlite3 |
| **Realm** | Complex setup, overkill for local-only app | better-sqlite3 |
| **Electron remote** | Security risk, deprecated | IPC with contextBridge |
| **nodeIntegration: true** | Security vulnerability | contextIsolation with preload |

---

## Stack Patterns by Variant

### Security-First Variant (ClawHive Default)
- **Electron**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- **Process Model**: Utility process per agent for isolation
- **Storage**: SQLCipher for encrypted SQLite
- **IPC**: Strict validation with zod schemas

### Performance-First Variant
- **Build**: Vite with esbuild for faster builds
- **Linting**: oxlint instead of ESLint
- **Testing**: vitest with --pool=forks for parallel execution

### Minimal Bundle Variant
- **UI**: Preact instead of React (3KB vs 40KB)
- **State**: nanostores instead of Zustand
- **CSS**: Tailwind with purge (no runtime CSS-in-JS)

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Electron 33 | Node 22 | Native Node 22 support |
| Vite 6 | vitest 3 | Shared config, fast transforms |
| React 18 | TypeScript 5 | Full type support |
| better-sqlite3 11 | Node 22 | Prebuilt binaries available |
| Electron 33 | macOS 13+ | Minimum deployment target |

---

## OpenClaw SDK Integration Points

The OpenClaw SDK provides the following integration surfaces:

| SDK Component | ClawHive Usage |
|---------------|----------------|
| **Agent Runtime** | Create and manage individual agents |
| **Skills System** | Load npm skills per agent |
| **MCP Registry** | Model Context Protocol for tool integration |
| **Session Manager** | Conversation history and context |
| **Peer Communication** | Agent-to-agent messaging |

### Custom Extensions Required

| Component | Custom Code Needed |
|-----------|-------------------|
| **Hierarchy Engine** | CEO → CFO/COO → Dept → Team → Agent flow |
| **Security Layer** | Sandbox bridge, permissions, privacy guard |
| **Task Router** | Role-based task assignment |
| **Team Manager** | Shared memory, selective conversation sharing |
| **Report Generator** | Assessment reports flowing up hierarchy |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                   ELECTRON FRONTEND                      │
│  React + Zustand + Tailwind + shadcn/ui                 │
│  Org Tree │ Chat │ Swarm View │ Progress │ Settings     │
└─────────────────────────────────────────────────────────┘
                          │ IPC (contextBridge)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   MAIN PROCESS                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │           CLAWHIVE ORCHESTRATION CORE               ││
│  │  Agent Registry │ Task Router │ Team Manager        ││
│  │  Security Manager │ Privacy Guard │ Plan Engine     ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │              OPENCLAW SDK INTEGRATION               ││
│  │  Agent Runtime │ Skill Loader │ MCP Registry        ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                         │
│  SQLite (encrypted) │ electron-store │ Model Providers  │
└─────────────────────────────────────────────────────────┘
```

---

## Build Order

1. **Foundation**: pnpm workspace, TypeScript config, Vite setup
2. **Electron Shell**: Main process, preload, IPC handlers
3. **OpenClaw Integration**: SDK setup, agent creation, skills loading
4. **Hierarchy Engine**: Agent registry, task router, team manager
5. **Security Layer**: Sandbox bridge, permissions, privacy guard
6. **Model Providers**: Anthropic, OpenAI, Ollama, custom base URL
7. **UI Components**: React app, org tree, chat views
8. **Testing**: Vitest unit tests, Playwright E2E
9. **Distribution**: electron-builder, DMG, auto-update

---

## Security Configuration

### Electron Security Requirements
```javascript
// Main process
const win = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,    // Required
    nodeIntegration: false,    // Required
    sandbox: true,             // For agent utility processes
    webSecurity: true,         // Enable web security
  }
});

// Preload script
contextBridge.exposeInMainWorld('clawhive', {
  // Only exposed APIs, no direct Node access
});
```

### Data Security
- **SQLite**: SQLCipher or similar for encryption at rest
- **electron-store**: Enable encryption for sensitive configs
- **No cloud sync**: All data stays local per PROJECT.md

---

## Sources

- OpenClaw codebase analysis — agent framework, skills, MCP patterns
- Electron security best practices — contextIsolation, sandboxing
- React ecosystem — Zustand, Tailwind, shadcn/ui
- Training data on 2025 desktop AI assistant landscape

---

*Stack research for: ClawHive Desktop Multi-Agent AI Assistant*
*Researched: 2026-03-28*
