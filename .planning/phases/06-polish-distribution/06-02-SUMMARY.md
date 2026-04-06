---
phase: 06-polish-distribution
plan: 06-02
wave: 2
subsystem: distribution
tags: [macos, code-signing, notarization, auto-update, dmg]
dependency_graph:
  requires: []
  provides: [auto-update, code-signing, notarization]
  affects: [build, release]
tech_stack:
  added:
    - electron-updater (^6.3.9)
    - @electron/notarize (^2.5.0)
    - cross-env (^7.0.3)
  patterns:
    - DMG packaging with Applications shortcut
    - User-prompted auto-update (not silent)
    - Hardened Runtime + notarization
key_files:
  created:
    - apps/desktop/build/notarize.js
    - apps/desktop/src/main/updater.ts
    - apps/desktop/BUILD.md
  modified:
    - apps/desktop/electron-builder.yml
    - apps/desktop/package.json
    - apps/desktop/src/main/index.ts
decisions:
  - User-prompted updates over silent updates (better UX, explicit user consent)
  - 30-day check interval (balance between staying current and not annoying users)
metrics:
  duration: ~15 minutes
  completed_date: 2026-04-06
---

# Phase 06 Plan 02: Distribution Summary

**One-liner:** Code signing, notarization, DMG packaging, and user-prompted auto-updater for macOS

## Tasks Completed

### Task 1: Configure Code Signing and Notarization
- Added `notarize` block to `electron-builder.yml` with team ID from env var
- Created `build/notarize.js` script for electron-builder to call during packaging
- Updated `package.json` with `@electron/notarize` dependency and `build:mac:signed` script
- Documented prerequisites in `BUILD.md`

### Task 2: Implement Auto-Updater
- Added `electron-updater` to dependencies
- Created `src/main/updater.ts` with user-prompted flow:
  - Checks on launch (production only)
  - Then checks every 30 days (stored in electron-store)
  - Shows dialog with release notes before download
  - User must click "Download Update" to start download
  - User must click "Install and Restart" to apply update
- Integrated into `main/index.ts` - initialized after window is ready

### Task 3: DMG and Release Asset Configuration
- Added `iconSize: 100` and `title` to DMG config in `electron-builder.yml`
- DMG includes Applications shortcut (existing)
- Configured for both x64 and arm64 builds
- Added build scripts to `package.json`

## Deviations from Plan

**None** - Plan executed exactly as written.

## Verification

Manual verification steps:
1. Run `pnpm build:mac` → DMG created in `release/`
2. Open DMG → drag app to Applications works  
3. Launch app from Applications → runs correctly
4. Simulate update available → prompt appears (not silent download)

## Auth Gates

None - all configurations use environment variables and don't require live authentication during build.

## Notes

- The updater LSP error about `electron-updater` types is expected until `pnpm install` runs to install the new dependency
- Pre-existing unrelated LSP errors in Settings.tsx, ModelPicker.tsx, and useCustomProvider.ts are outside this plan's scope
