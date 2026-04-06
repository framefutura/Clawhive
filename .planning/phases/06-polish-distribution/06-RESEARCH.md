# Phase 6: Polish & Distribution - Research

**Researched:** 2026-04-05  
**Domain:** Electron desktop app polish, internationalization, and distribution  
**Confidence:** HIGH

## Summary

This phase covers final UX polish and production distribution for an Electron-based desktop application. The research identifies i18next as the standard i18n solution for React/Electron apps, electron-builder for comprehensive macOS code signing and notarization, and electron-updater with custom event handlers for implementing monthly-check update prompts. Custom LLM providers follow the OpenAI-compatible API pattern with base URL configuration and model list fetching via `/v1/models` or `/api/tags` endpoints.

**Primary recommendation:** Use i18next for i18n, electron-builder for notarization, electron-updater with manual check triggers for updates, and OpenAI-compatible API pattern for custom providers.

---

## User Constraints (from CONTEXT.md)

> **Note:** No CONTEXT.md exists for this phase. All requirements are user-defined in the phase description.

### Locked Requirements (POL-01 through POL-09)
- POL-01: Bilingual UI supports English and Chinese
- POL-02: Auto-update checks monthly and prompts user (not automatic)
- POL-03: macOS TCC permissions handled gracefully (prompt, not crash)
- POL-04: First-launch wizard for agent creation and config import
- POL-05: Import from existing OpenClaw/Claude Code configuration
- POL-06: Performance optimized for multi-agent workloads
- POL-07: DMG distribution with code signing and notarization
- POL-08: Custom provider support with base URL configuration
- POL-09: Auto-fetch model lists from custom providers

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| i18next | ^24.0.0 | Internationalization framework | Industry standard for React/Electron, supports pluralization, interpolation, nesting |
| react-i18next | ^15.0.0 | React bindings for i18next | Official React integration, hooks-based API |
| electron-builder | ^25.0.0 | App packaging and distribution | Handles code signing, notarization, DMG creation automatically |
| electron-updater | ^6.0.0 | Auto-update functionality | Part of electron-builder ecosystem, supports multiple providers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-log | ^5.0.0 | Logging for debugging auto-updater | When implementing update checks |
| @electron/notarize | ^3.1.0 | Notarization API wrapper | If manual notarization control needed |
| electron-mac-permissions | ^2.2.0 | TCC permission management | When needing to query/gracefully request permissions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| i18next | react-intl | i18next has better pluralization and interpolation, react-intl is older |
| electron-builder | electron-packager + manual scripts | electron-builder handles notarization automatically |
| electron-updater | Built-in autoUpdater | electron-updater has better Linux support and code signature validation |

**Installation:**
```bash
npm install i18next react-i18next electron-builder electron-updater electron-log
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── i18n/                    # Internationalization
│   ├── index.ts              # i18next configuration
│   ├── locales/
│   │   ├── en.json           # English translations
│   │   └── zh-CN.json        # Chinese translations
│   └── settings.ts           # Language detection settings
├── updater/                  # Auto-update logic
│   └── AutoUpdater.ts        # Update manager with monthly check
├── wizard/                   # First-launch wizard
│   ├── FirstLaunchWizard.tsx # Main wizard component
│   ├── steps/
│   │   ├── AgentCreation.tsx
│   │   └── ConfigImport.tsx
│   └── ConfigImporter.ts     # Import from Claude Code config
├── distribution/              # Distribution config
│   └── electron-builder.yml   # Build configuration
└── providers/                 # Custom LLM providers
    ├── CustomProvider.ts      # Base provider class
    └── OllamaProvider.ts      # OpenAI-compatible implementation
```

### Pattern 1: i18n with Language Detection
**What:** i18next configuration with automatic locale detection from system and user preferences
**When to use:** For bilingual UI with English and Chinese support
**Example:**
```typescript
// Source: https://www.i18next.com/principles/best-practices
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      'zh-CN': { translation: require('./locales/zh-CN.json') }
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });
```

### Pattern 2: Monthly Update Check with User Prompt
**What:** Custom implementation of electron-updater that checks monthly and shows notification instead of auto-installing
**When to use:** For POL-02 requirement - "checks monthly and prompts user (not automatic)"
**Example:**
```typescript
// Source: electron-builder auto-update docs
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

const CHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days
const LAST_CHECK_KEY = 'lastUpdateCheck';

export class MonthlyUpdateChecker {
  constructor() {
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false; // Don't auto-download
    autoUpdater.autoInstallOnAppQuit = false; // Don't auto-install
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    autoUpdater.on('update-available', (info) => {
      // Show user prompt instead of auto-downloading
      this.showUpdatePrompt(info);
    });
    
    autoUpdater.on('update-not-available', () => {
      this.updateLastCheckTime();
    });
  }

  async checkForUpdates() {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    
    if (lastCheck && (now - parseInt(lastCheck)) < CHECK_INTERVAL_MS) {
      return; // Skip - hasn't been a month yet
    }
    
    await autoUpdater.checkForUpdates();
    this.updateLastCheckTime();
  }

  private updateLastCheckTime() {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  }

  private showUpdatePrompt(info) {
    // Show user-facing dialog with update info
    // User chooses to download or dismiss
  }
}
```

### Pattern 3: Custom LLM Provider with Base URL
**What:** OpenAI-compatible provider configuration with model list fetching
**When to use:** For POL-08 and POL-09 - custom provider support with auto-fetch model lists
**Example:**
```typescript
interface ProviderConfig {
  baseURL: string;      // e.g., "http://localhost:11434/v1"
  apiKey?: string;
  modelListEndpoint?: string;
}

interface ModelInfo {
  id: string;
  name: string;
}

class CustomOpenAIProvider {
  constructor(private config: ProviderConfig) {}

  async fetchModelList(): Promise<ModelInfo[]> {
    // Try OpenAI-compatible /v1/models first
    const endpoints = [
      `${this.config.baseURL}/v1/models`,
      `${this.config.baseURL}/api/tags`  // Ollama-style
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: this.config.apiKey 
            ? { 'Authorization': `Bearer ${this.config.apiKey}` }
            : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          return this.parseModelList(data, endpoint);
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Could not fetch model list from provider');
  }

  private parseModelList(data: any, endpoint: string): ModelInfo[] {
    if (endpoint.includes('/v1/models')) {
      return data.data?.map((m: any) => ({ id: m.id, name: m.id })) || [];
    }
    // Ollama /api/tags format
    return data.models?.map((m: any) => ({ id: m.name, name: m.name })) || [];
  }
}
```

### Pattern 4: Config Import from Claude Code
**What:** Read configuration from Claude Code's config directory
**When to use:** For POL-05 - importing existing OpenClaw/Claude Code configuration
**Example:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface ClaudeCodeConfig {
  providers?: Record<string, any>;
  models?: string[];
}

export async function importClaudeCodeConfig(): Promise<ClaudeCodeConfig | null> {
  const configPaths = [
    path.join(process.env.HOME || '', '.claude', 'settings.json'),
    path.join(process.env.HOME || '', '.openclaw', 'config.json'),
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}
```

### Anti-Patterns to Avoid
- **Hardcoding translations in components:** Always use i18next for all user-facing strings to enable translation updates without code changes
- **Auto-installing updates:** For POL-02, must use manual check with user prompt - never auto-download without consent
- **Assuming TCC permissions are granted:** Always check permission status before using camera/microphone/etc. and provide graceful fallback
- **Not handling notarization failures:** Build will fail on user's machines if not properly notarized - always test locally first

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| i18n infrastructure | Custom translation loader | i18next + react-i18next | Handles pluralization, interpolation, nesting, lazy loading out of the box |
| macOS code signing | Manual codesign commands | electron-builder | Auto-selects certificate, handles hardened runtime, manages keychain |
| Notarization workflow | Manual xcrun notarytool | electron-builder + @electron/notarize | Handles ticket stapling, retries, error handling |
| Update checking | Custom HTTP polling | electron-updater | Validates code signatures, handles differential updates |
| Locale detection | Custom browserlanguage detection | i18next i18next-browser-languagedetector | Handles all major detection methods with caching |

**Key insight:** Building custom solutions for these problems introduces edge cases that have already been solved by established libraries. The complexity of macOS notarization alone justifies using electron-builder.

---

## Common Pitfalls

### Pitfall 1: Notarization Fails Without Clear Error
**What goes wrong:** electron-builder reports "notarization failed" but no specific error message
**Why it happens:** Missing hardened runtime entitlements, unsigned native modules, or invalid bundle ID
**How to avoid:** 
- Ensure `entitlements.mac.plist` contains required entries
- Sign all native dependencies (`npm rebuild`)
- Verify bundle ID matches your Apple Developer certificate
- Run `xcrun notarytool log` for detailed error
**Warning signs:** Build succeeds but app won't run on other Macs

### Pitfall 2: Auto-Updater Checks Too Frequently
**What goes wrong:** App checks for updates on every launch, annoying users
**Why it happens:** Not implementing interval-based checking as per POL-02
**How to avoid:** 
- Store last check timestamp in localStorage or config file
- Only check if 30+ days since last check
- Add "Check for Updates" in menu for manual checks
**Warning signs:** Users complain about update prompts or network activity

### Pitfall 3: TCC Permission Crash
**What goes wrong:** App crashes when microphone/camera permission denied
**Why it happens:** Not checking permission status before using APIs
**How to avoid:** 
- Check permission status before API calls
- Provide graceful UI fallback when denied
- Use `electron-mac-permissions` to query status
**Warning signs:** App starts crashing on macOS 14+ where permissions are stricter

### Pitfall 4: Translation Keys Not Found
**What goes wrong:** User sees translation keys like `{{t('common.save')}}` instead of actual text
**Why it happens:** Missing translation files or wrong namespace
**How to avoid:** 
- Use i18next's `useFixedT` hook for performance
- Add fallback language
- Implement runtime validation of translation completeness
**Warning signs:** Missing translations in production builds

### Pitfall 5: Custom Provider Model List Not Loading
**What goes wrong:** Model dropdown empty for custom providers
**Why it happens:** Provider doesn't implement standard `/v1/models` endpoint
**How to avoid:** 
- Try both `/v1/models` and `/api/tags` endpoints
- Provide manual model entry as fallback
- Show clear error when fetch fails
**Warning signs:** Custom provider works for chat but not for model selection

---

## Code Examples

### i18n Setup with English/Chinese Locales
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

### electron-builder Configuration for Notarization
```yaml
# electron-builder.yml
mac:
  category: public.app-category.developer-tools
  target:
    - dmg
    - zip
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

publish:
  provider: generic
  url: https://example.com/releases/

# Environment variables for CI (set externally):
# APPLE_ID=your-apple-id@example.com
# APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
# APPLE_TEAM_ID=YOUR_TEAM_ID
```

### First-Launch Wizard State Management
```typescript
// src/wizard/hooks/useWizardState.ts
import { useState, useEffect } from 'react';

interface WizardState {
  step: number;
  hasExistingConfig: boolean;
  isComplete: boolean;
}

const WIZARD_COMPLETE_KEY = 'wizardCompleted';

export function useWizardState() {
  const [state, setState] = useState<WizardState>({
    step: 0,
    hasExistingConfig: false,
    isComplete: localStorage.getItem(WIZARD_COMPLETE_KEY) === 'true'
  });

  useEffect(() => {
    // Check for existing Claude Code config on mount
    importClaudeCodeConfig().then(config => {
      if (config) {
        setState(s => ({ ...s, hasExistingConfig: true }));
      }
    });
  }, []);

  const completeWizard = () => {
    localStorage.setItem(WIZARD_COMPLETE_KEY, 'true');
    setState(s => ({ ...s, isComplete: true }));
  };

  return { state, completeWizard, setState };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual code signing scripts | electron-builder automatic signing | 2019+ | Eliminates CI configuration complexity |
| electron-builder built-in autoUpdater | electron-updater separate package | 2020+ | Better separation of concerns, more providers |
| Hardcoded translations | i18next with JSON files | 2015+ | Enables non-developer translation updates |
| Static model lists | Dynamic /v1/models fetching | 2023+ | Enables self-hosted providers like Ollama |

**Deprecated/outdated:**
- **Squirrel.Mac:** Replaced by DMG+zip with electron-updater (2020)
- **Bintray publishing:** Service shut down, use generic provider (2021)
- **node-mac-permissions:** Replaced by electron-mac-permissions (2020)

---

## Open Questions

1. **Config import from Claude Code**
   - What is the exact location and format of Claude Code configuration?
   - Is there documentation on importing settings from the existing tool?
   - **Recommendation:** Examine local Claude Code installation to verify config paths and format

2. **TCC permission handling specifics**
   - Which specific permissions does the app need (microphone, camera, accessibility)?
   - Is there a need for Accessibility permissions for agent automation?
   - **Recommendation:** Audit required permissions during Phase 6 implementation

3. **Update server hosting**
   - Where will the `latest-mac.yml` and DMG files be hosted?
   - Is there an existing server or should GitHub Releases be used?
   - **Recommendation:** Decide on hosting strategy before implementing auto-update

---

## Sources

### Primary (HIGH confidence)
- electron-builder macOS Code Signing & Notarization docs - https://www.mintlify.com/electron-userland/electron-builder/guides/code-signing/macos
- electron-builder Auto-Update Setup - https://mintlify.com/electron-userland/electron-builder/guides/auto-update/setup
- i18next Best Practices - https://www.i18next.com/principles/best-practices
- Ollama API /api/tags - https://docs.ollama.com/api/tags

### Secondary (MEDIUM confidence)
- electron-updater npm package documentation
- React i18n with i18next tutorial (Crowdin Blog, Oct 2025)
- macOS notarization community guides (December 2025)

### Tertiary (LOW confidence)
- WebSearch for first-launch wizard patterns - needs validation against specific app requirements
- Config import from Claude Code - unverified, needs local investigation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are industry standard with verified documentation
- Architecture: HIGH - Patterns match Electron best practices
- Pitfalls: HIGH - Known issues from official docs and community experience

**Research date:** 2026-04-05  
**Valid until:** 2026-05-05 (30 days - stable domain)
