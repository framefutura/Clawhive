# ClawHive Desktop Build Guide

## Prerequisites

### Environment Variables

To build and sign the macOS app, you need the following environment variables:

| Variable | Description |
|----------|-------------|
| `APPLE_ID` | Your Apple Developer ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization (generate at appleid.apple.com) |
| `APPLE_TEAM_ID` | Your Apple Team ID (found in Developer account) |

### Certificates

- **Developer ID Application** certificate installed in Keychain
- Request from: https://developer.apple.com/account/resources/certificates

### Setting Up Environment

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export APPLE_ID="your-email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="A1B2C3D4E5"
```

## Building

### Development Build

```bash
cd apps/desktop
pnpm install
pnpm dev
```

### Production Build (unsigned)

```bash
pnpm build:mac
```

### Production Build (signed + notarized)

```bash
pnpm build:mac:signed
```

For CI/CD, use repository secrets:
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`  
- `APPLE_TEAM_ID`
- `CSC_LINK` (base64-encoded Developer ID certificate)
- `CSC_KEY_PASSWORD` (certificate key password)

## Output

After building, artifacts are in `apps/desktop/release/`:

- `ClawHive-{version}-x64.dmg` - Intel build
- `ClawHive-{version}-arm64.dmg` - Apple Silicon build
- `ClawHive-{version}-x64.zip` - Intel ZIP fallback
- `ClawHive-{version}-arm64.zip` - ARM64 ZIP fallback
- `latest-mac.yml` - Auto-updater metadata

## Auto-Update

The app checks for updates:
1. On every launch in production mode
2. Then every 30 days

When an update is available:
- User sees a prompt with release notes
- Download starts only after user clicks "Download Update"
- Install happens only after user clicks "Install and Restart"

## Troubleshooting

### Notarization Fails

1. Verify certificate: `security find-identity -v -p codesigning`
2. Check app-specific password is correct
3. Ensure team ID matches your certificate

### Build Fails with "Hardened Runtime"

Ensure entitlements file is properly configured: `build/entitlements.mac.plist`

### DMG Won't Mount

Check if system already has the app installed, or if there's a quarantine issue:
```bash
xattr -cr /path/to/ClawHive.app
```
