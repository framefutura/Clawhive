# ClawHive Threat Model

**Version:** 1.0
**Last Updated:** 2026-03-31
**Classification:** Internal

## Scope

This document analyzes threats to the ClawHive desktop multi-agent platform. It covers:
- Agent-to-system threats (agents escaping their sandbox)
- Agent-to-user threats (agents accessing sensitive data)
- Agent-to-agent threats (Phase 4+)
- Supply chain and operational threats

## STRIDE Analysis

### Spoofing

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent impersonates user | High | Approval gates for sensitive actions; high security level | ✅ |
| Malicious agent joins organization | Medium | Agent registry with approval; role assignment | 🔄 Phase 4 |
| Session hijacking | Medium | Session IDs cryptographically random; IPC isolated | ✅ |

### Tampering

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent modifies own permissions | High | Permission matrix in main process, not accessible to agent | ✅ |
| Agent modifies audit log | Medium | Append-only SQLite; future hash chain | ✅/🔄 |
| Agent modifies another agent's files | Medium | Workspace isolation; file path validation | ✅ |
| Agent modifies security configuration | High | Settings require user approval; config file permissions | ✅ |

### Repudiation

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent denies performing action | Low | Immutable activity log with timestamps | ✅ |
| User denies approving action | Low | Approval logged with session correlation | ✅ |
| System denies security event | Low | Centralized audit log in SQLite | ✅ |

### Information Disclosure

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent reads SSH keys | Critical | Privacy Guard blocks ~/.ssh/* by default | ✅ |
| Agent reads browser cookies | Critical | Privacy Guard blocks browser cookie paths | ✅ |
| Agent reads environment variables | High | Child process env filtered; secrets excluded | ✅ |
| Agent reads other agent's memory | Medium | Process isolation; no shared memory | ✅ |
| Agent reads system files | High | Path blocking for /etc/passwd, /etc/shadow | ✅ |
| Agent exfiltrates data via network | Medium | Network requests require approval; host allowlists | ✅ |
| Error messages leak paths | Medium | Error sanitization in sandboxed bridge | ✅ |
| Agent reads audit log | Low | Activity log only accessible via IPC, not to agents | ✅ |

### Denial of Service

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent runs infinite loop | Medium | Circuit breaker (100 calls); loop detection | ✅ |
| Agent spawns infinite processes | Medium | Circuit breaker; process limits | ✅ |
| Agent fills disk with files | Medium | Workspace quota (future); file size limits | 🔄 v1.1 |
| Agent consumes all memory | Medium | Process memory limits (future) | 🔄 v1.1 |
| Agent makes infinite network requests | Medium | Circuit breaker; rate limiting | ✅ |

### Elevation of Privilege

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Agent escapes sandbox via shell | Critical | Subprocess isolation; no shell escape chars allowed | ✅ |
| Agent gains main process access | Critical | contextIsolation=true; nodeIntegration=false | ✅ |
| Agent exploits renderer preload | High | Preload exposes minimal API surface | ✅ |
| Agent modifies own role | High | Roles managed in main process, not renderer | ✅ |
| Agent escalates via path traversal | High | Path traversal detection in Privacy Guard | ✅ |
| Agent exploits tool permission bug | Medium | Deny-by-default; explicit allow required | ✅ |

## Trust Boundaries

```
┌────────────────────────────────────────────────────────────────────┐
│                           USER                                      │
│  Trust Level: Implicit                                              │
│  Responsibilities: Approval decisions, security configuration       │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ User Interface (IPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                               │
│  Trust Level: Semi-trusted                                          │
│  Responsibilities: UI rendering, user input, display security state │
│  Isolation: contextIsolation=true, nodeIntegration=false           │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ IPC (contextBridge)
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS                                  │
│  Trust Level: Privileged                                            │
│  Responsibilities: Security enforcement, file access, network      │
│  Components: SecurityManager, PrivacyGuard, SandboxedBridge        │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ spawn(), IPC
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                      CHILD PROCESS                                  │
│  Trust Level: Restricted                                            │
│  Responsibilities: Isolated code execution                          │
│  Restrictions: Workspace-only, timeout, sanitized errors           │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ stdout/stderr
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                        AI MODEL                                     │
│  Trust Level: Untrusted                                             │
│  Responsibilities: Action generation (all actions validated)       │
└────────────────────────────────────────────────────────────────────┘
```

## Attack Scenarios

### Scenario 1: Credential Harvesting

**Attack:** Agent attempts to read ~/.ssh/id_rsa

**Defense:**
1. Privacy Guard checks path against blocked patterns
2. ~/.ssh/* is in DEFAULT_BLOCKED_PATTERNS
3. Immediate deny, no approval opportunity
4. Logged to activity_log with details

**Verification:**
```typescript
// In privacy-guard.test.ts
expect(guard.checkPath('~/.ssh/id_rsa', 'read').allowed).toBe(false)
```

### Scenario 2: Shell Injection

**Attack:** Agent executes `shell_exec("ls; cat /etc/passwd")`

**Defense:**
1. Suspicious pattern detection checks for shell metacharacters
2. Multiple commands detected (semicolon)
3. Blocked at high security, approval at medium
4. If approved, runs in sandboxed child process
5. Child process cannot escape workspace

**Verification:**
```typescript
// Suspicious signals
expect(detectSuspicious({ type: 'execution', command: 'ls; cat /etc/passwd' }))
  .toContain('shellInjection')
```

### Scenario 3: Permission Escalation

**Attack:** Agent attempts to modify its role to gain shell access

**Defense:**
1. Roles stored in main process SQLite
2. No IPC channel for agents to modify roles
3. Role modification requires user action in UI
4. SecurityManager reads role from database, not from agent

**Trust Boundary:** Agents never receive permission matrix directly

### Scenario 4: Infinite Tool Loop

**Attack:** Agent repeatedly calls fs.read in infinite loop

**Defense:**
1. Circuit breaker tracks call count per session
2. 100 call limit triggers automatic pause
3. User notified via UI, can resume or end session
4. Loop detection (3 identical calls in 5) also triggers pause

**Verification:**
```typescript
// After 100 calls
expect(sandboxedBridge.canExecute(sessionId, 'fs.read', context).allowed)
  .toBe(false) // Circuit breaker tripped
```

### Scenario 5: Path Traversal

**Attack:** Agent attempts `fs.read("../../../etc/passwd")`

**Defense:**
1. Privacy Guard normalizes paths
2. Path traversal pattern detected (../)
3. Checked against workspace boundaries
4. Blocked if outside safe zones

**Verification:**
```typescript
expect(guard.checkPath('../../../etc/passwd', 'read').allowed).toBe(false)
```

## Residual Risks

These risks are accepted or deferred:

| Risk | Reason | Mitigation |
|------|--------|------------|
| **Zero-day in Electron** | Vendor responsibility | Auto-update, security advisories monitoring |
| **Compromised npm dependency** | Supply chain risk | Lockfile, audit, minimal dependencies |
| **Physical access to device** | Out of scope | Disk encryption (user responsibility) |
| **Social engineering of user** | Human factor | Security education, clear approval dialogs |
| **Side-channel attacks** | Complex mitigation | Future: constant-time operations |
| **Model prompt injection** | AI model risk | Deterministic security, not prompt-based |

## Security Checklist

### For Developers

- [ ] New tools added to ToolRegistry with appropriate category
- [ ] File operations pass through PrivacyGuard
- [ ] Network operations validate host against allowlist
- [ ] Sensitive operations require approval at medium+ security
- [ ] All security decisions logged to activity_log
- [ ] Error messages don't leak paths or stack traces
- [ ] IPC channels validate all inputs
- [ ] No nodeIntegration in renderer
- [ ] Preload exposes minimal API surface

### For Operators

- [ ] Review activity log weekly
- [ ] Set appropriate security levels for tasks
- [ ] Define safe zones for project directories
- [ ] Configure role permissions per agent
- [ ] Keep app updated (security patches)
- [ ] Review and approve/deny security events promptly

### For Users

- [ ] Use high security for sensitive tasks
- [ ] Review approval dialogs carefully
- [ ] Don't approve suspicious operations
- [ ] Report unexpected approval requests
- [ ] Keep workspace organized (aids safe zone management)

## Compliance Mapping

| Control | Implementation |
|---------|---------------|
| **Least Privilege** | Deny-by-default tool registry; role-based permissions |
| **Defense in Depth** | Multiple security layers (PrivacyGuard, SecurityManager, SandboxedBridge) |
| **Audit Logging** | Immutable activity_log with all security events |
| **Input Validation** | Path validation, suspicious pattern detection |
| **Error Handling** | Sanitized errors, no information leakage |
| **Session Management** | Session isolation, timeout, circuit breakers |

## References

- Security Architecture: `ARCHITECTURE.md`
- Implementation: `apps/desktop/src/main/security-manager.ts`
- Privacy Guard: `apps/desktop/src/main/privacy-guard.ts`
- Sandboxed Bridge: `apps/desktop/src/main/sandboxed-bridge.ts`
- Tool Registry: `apps/desktop/src/main/tool-registry.ts`
