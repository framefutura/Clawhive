# ClawHive Security Architecture

**Version:** 1.0
**Last Updated:** 2026-03-31
**Applies To:** Phase 3 Security Core (Complete)

## Overview

ClawHive implements a defense-in-depth security model with multiple layers of protection. This document describes the security architecture, components, and data flows.

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Security     │  │ Privacy      │  │ Approval     │      │
│  │ Panel        │  │ Settings     │  │ Dialog       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Electron Main Process                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Security Manager                       │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ Permission   │  │ Suspicious   │                │   │
│  │  │ Matrix       │  │ Detection    │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────┐      │
│  │              Privacy Guard                       │      │
│  │  ┌──────────────┐  ┌──────────────┐             │      │
│  │  │ Path         │  │ Safe Zone    │             │      │
│  │  │ Blocking     │  │ Management   │             │      │
│  │  └──────────────┘  └──────────────┘             │      │
│  └──────────────────────────────────────────────────┘      │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────┐      │
│  │              Sandboxed Bridge                    │      │
│  │  ┌──────────────┐  ┌──────────────┐             │      │
│  │  │ Tool         │  │ Circuit      │             │      │
│  │  │ Registry     │  │ Breaker      │             │      │
│  │  └──────────────┘  └──────────────┘             │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Child Process (Sandbox)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Isolated execution environment with:               │   │
│  │  - Limited filesystem access (workspace only)       │   │
│  │  - 30-second timeout                                │   │
│  │  - Error sanitization                               │   │
│  │  - No network access (unless explicitly granted)    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Security Manager (`apps/desktop/src/main/security-manager.ts`)

The central security decision engine. All security-sensitive operations flow through here.

**Key Methods:**
- `evaluateAction(level, role, action)` — Makes allow/deny/approval decisions
- `requestApproval(request)` — Initiates user approval flow
- `resolveApproval(id, approved)` — Completes approval promise
- `getActivityLog()` — Returns audit trail

**Decision Flow:**
1. **Privacy Guard Check** — Block sensitive paths (SSH keys, credentials)
2. **Suspicious Pattern Detection** — Block credential access, shell injection
3. **Permission Matrix Check** — Role-based allow/deny/prompt
4. **Security Level Check** — High=always approve, Medium=sensitive approve, Low=allow

### 2. Privacy Guard (`apps/desktop/src/main/privacy-guard.ts`)

Path-level security enforcement with safe zone management.

**Features:**
- **Blocked Patterns:** SSH keys, macOS Keychain, AWS credentials, browser cookies, etc.
- **Safe Zones:** Workspace directories + user-defined zones
- **Path Traversal Protection:** Blocks `../../` patterns

**Default Blocked Paths:**
```typescript
const DEFAULT_BLOCKED_PATTERNS = [
  '~/.ssh/*',           // SSH keys
  '~/Library/Keychains/*', // macOS Keychain
  '~/.aws/*',           // AWS credentials
  '~/.npmrc',           // npm registry credentials
  '~/.git-credentials', // Git credentials
  '~/.docker/*',        // Docker configs
  '~/.kube/*',          // Kubernetes configs
  '/etc/passwd',        // System files
  '/etc/shadow',
]
```

### 3. Sandboxed Bridge (`apps/desktop/src/main/sandboxed-bridge.ts`)

Isolates code execution in child processes with strict limits.

**Features:**
- **Subprocess Isolation:** Shell commands run in spawned processes
- **Workspace Scoping:** Child processes restricted to agent workspace
- **Timeout:** 30-second hard limit
- **Error Sanitization:** Stack traces and paths stripped from errors

### 4. Tool Registry (`apps/desktop/src/main/tool-registry.ts`)

Deny-by-default tool permission system.

**Tool Categories:**
- **Safe:** `fs_read`, `chat_send`, `task_create`
- **Caution:** `browser_navigate`, `http_request`, `agent_delegate`
- **Dangerous:** `shell_exec`, `fs_write`, `fs_delete`

**Enablement Requirements:**
- Safe: User toggle
- Caution: User toggle + role check
- Dangerous: User toggle + security level check (medium/low only)

### 5. Circuit Breakers (`apps/desktop/src/main/sandboxed-bridge.ts`)

Prevents runaway tool execution.

**Limits:**
- Max 100 tool calls per session
- 10-minute cumulative execution time
- Loop detection: 3 identical calls within 5-call window
- Rapid-fire detection: 5+ calls to same tool within 1 second

## Permission Matrix

Roles define capabilities via a permission matrix with three states:

```typescript
interface PermissionMatrix {
  tools: Record<string, 'allow' | 'deny' | 'prompt'>
  files: {
    read: string[]      // Glob patterns
    write: string[]
    deny: string[]
  }
  network: {
    allowHosts: string[]  // Host patterns
    denyHosts: string[]
  }
  execution: {
    shell: 'allow' | 'deny' | 'prompt'
    code: 'allow' | 'deny' | 'prompt'
  }
}
```

### Default Roles

| Role | Default Level | Shell | Key Capabilities |
|------|--------------|-------|------------------|
| CEO Agent | Medium | Prompt | Broad tool access, delegation |
| CFO Agent | Medium | Deny | Financial tools, audit access |
| Security Agent | High | Prompt | Security scanning, audit logs |
| Individual Agent | Medium | Deny | Narrow tool set, safe ops |

## Approval Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Agent   │────▶│   Security   │────▶│  Evaluates:  │
│  Action  │     │   Manager    │     │  - Privacy   │
└──────────┘     └──────────────┘     │  - Suspicious│
                                      │  - Matrix    │
                                      │  - Level     │
                                      └──────────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                         ┌────────┐    ┌────────┐    ┌────────┐
                         │  Deny  │    │ Approve│    │ Prompt │
                         │        │    │        │    │  User  │
                         └────────┘    └────────┘    └────┬───┘
                                                          │
                               ┌──────────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Renderer Process   │
                    │  ┌────────────────┐  │
                    │  │ Approval Dialog│  │
                    │  │ - Reason       │  │
                    │  │ - Approve/Deny │  │
                    │  └────────────────┘  │
                    └──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   User Decision      │
                    │  (Promise Resolve)   │
                    └──────────────────────┘
```

## Security Levels

| Level | Description | Approval Required |
|-------|-------------|-------------------|
| **High** | Maximum security | All actions |
| **Medium** | Balanced security | Sensitive operations only |
| **Low** | Developer mode | Denied actions only |

**Sensitive Operations (Medium Level):**
- Shell execution
- File write outside workspace
- Network requests
- Dangerous tools (`fs.unlink`, `child_process.spawn`)

## Audit Logging

All security decisions are logged to an immutable SQLite table:

```sql
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_details TEXT,
  decision TEXT NOT NULL,
  reason TEXT,
  metadata TEXT  -- JSON
);
```

**Logged Events:**
- Security decisions (allow/deny/prompt)
- Approval requests and resolutions
- Suspicious pattern detection
- Circuit breaker triggers

## Trust Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                         USER                                  │
│  (Trusted: Makes approval decisions, configures security)    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    MAIN PROCESS                              │
│  (Privileged: Access to filesystem, network, child processes)│
│  - Security Manager enforces policy here                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  CHILD PROCESS                               │
│  (Sandboxed: Limited to workspace, timeout, no secrets)      │
│  - Sandboxed Bridge restricts execution here                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI MODEL                                  │
│  (Untrusted: Generates actions but cannot bypass security)   │
│  - All actions validated by Security Manager before execution│
└──────────────────────────────────────────────────────────────┘
```

## Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| Agent escapes sandbox | Child process isolation, workspace scoping, timeout |
| Agent accesses credentials | Privacy Guard path blocking, blocked patterns |
| Agent executes shell injection | Suspicious pattern detection, approval gates |
| Agent runs forever | Circuit breaker (100 calls), timeout (30s) |
| Agent loops infinitely | Loop detection (3x in 5 calls) |
| Agent bypasses permissions | Deny-by-default registry, deterministic checks |
| Agent reads sensitive files | Safe zones, path traversal protection |
| Audit log tampering | Append-only SQLite, future: hash chain |

## Configuration

### Adding Safe Zones

Users can define additional safe zones via Privacy Settings:

```typescript
// Via IPC
await window.clawhive.addSafeZone('~/Projects/allowed-project')
```

### Custom Roles

New roles can be created with custom permission matrices:

```typescript
const customRole = {
  role: 'DevOps Agent',
  defaultLevel: 'medium',
  permissions: {
    tools: {
      'fs_read': 'allow',
      'shell_exec': 'prompt',
      'docker_exec': 'deny'
    },
    // ...
  }
}
```

## Operational Security

### Monitoring

Review activity logs regularly:
- High volume of denials → Possible attack or misconfiguration
- Repeated suspicious patterns → Investigate agent behavior
- Circuit breaker triggers → Check for infinite loops

### Incident Response

1. **Pause Session:** `sandboxedBridge.pauseSession(sessionId, reason)`
2. **Revoke Tool:** Add to global tool blacklist
3. **Review Logs:** Export and analyze activity log
4. **Adjust Policy:** Update role permissions or security level

## Future Hardening (v1.1+)

- **Audit Log Hash Chain:** Cryptographic integrity for audit logs
- **Memory Encryption:** Encrypt sensitive data in memory
- **Network Isolation:** Per-agent network policies
- **Behavioral Analysis:** ML-based anomaly detection
- **External Agent Adapters:** Claude Code, Codex integration with same security model

## References

- Implementation: `apps/desktop/src/main/security-manager.ts`
- Tests: `apps/desktop/src/main/security-manager.test.ts`
- Types: `apps/desktop/src/common/security.ts`
- UI: `apps/desktop/src/renderer/components/SecurityPanel.tsx`
