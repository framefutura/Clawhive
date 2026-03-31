---
phase: 03-security-core
plan: 03-01
subsystem: security
requirements_addressed: [SEC-01, SEC-02, SEC-03, SEC-08]
tags: [security, permissions, roles, approval]
dependency_graph:
  requires: []
  provides: [03-02, 03-03]
  affects: [04-01, 04-02]
tech_stack:
  added: []
  patterns: [permission-matrix, role-based-access, deterministic-enforcement]
key_files:
  created:
    - apps/desktop/src/common/security.ts
    - apps/desktop/src/main/security-manager.ts
    - apps/desktop/src/renderer/components/SecurityPanel.tsx
  modified:
    - apps/desktop/src/main/storage.ts
    - apps/desktop/src/renderer/App.tsx
decisions:
  - Enforce security decisions in code, never in prompts (deterministic policy enforcement)
  - Permission matrix covers tools, files, network, and execution
  - 4 default roles with varying default security levels and capabilities
  - High security always requires approval; medium only for sensitive ops; low allows non-denied
  - Security panel integrated into task creation flow with visual level selector
metrics:
  duration: "25min"
  completed_date: "2026-03-31"
  tasks: 3
  files_created: 3
  files_modified: 2
---

# Phase 3 Plan 1: Security Manager Summary

**One-liner:** Implemented per-task security levels, approval workflows, and role-based permissions with deterministic code-level enforcement.

## What Was Built

### 1. Security Types and Permission Matrix (Task 03-01-01)

Created `apps/desktop/src/common/security.ts` with:

- **SecurityLevel** type: `'high' | 'medium' | 'low'`
- **PermissionMatrix** interface covering:
  - `tools`: Record of tool names to `'allow' | 'deny' | 'prompt'`
  - `files`: Read/write/deny path patterns
  - `network`: Allow/deny host patterns
  - `execution`: Shell and code execution permissions
- **RoleProfile** interface with default level and permissions
- **4 Default Roles**:
  - CEO Agent (medium): Broad tool access, shell prompts
  - CFO Agent (medium): Financial tools, shell denied
  - Security Agent (high): Audit tools, all else prompts
  - Individual Agent (medium): Narrow tool set

Updated `apps/desktop/src/main/storage.ts`:
- Added `roles` table with id, name, default_level, permissions
- Implemented `seedDefaultRoles()` to populate default roles
- Added role CRUD operations: `listRoles`, `getRole`, `getRoleByName`, `createRole`, `updateRole`, `deleteRole`

### 2. Security Manager Core (Task 03-01-02)

Created `apps/desktop/src/main/security-manager.ts` with:

- **SecurityManager class** with methods:
  - `evaluateAction(level, role, action)`: Deterministic decision logic
  - `isSensitive(action)`: Detects sensitive operations
  - `getRequiredApprovals(decision)`: Generates approval requests
  - `requestApproval(request)`: Async approval flow with callbacks
  - `resolveApproval(id, approved)`: Resolve pending approvals

**Decision Logic:**
1. Check permission matrix first (deterministic)
2. If `deny` → blocked immediately
3. If `prompt` → always requires approval
4. If `allow` → check security level:
   - `low`: allow without prompt
   - `medium`: allow unless sensitive
   - `high`: always requires approval

**Sensitive Operations:**
- Shell execution
- File write outside workspace
- Network requests
- Dangerous tools (fs.unlink, child_process.spawn)

### 3. Security Panel UI (Task 03-01-03)

Created `apps/desktop/src/renderer/components/SecurityPanel.tsx`:

- **Visual Security Level Selector**: Three cards (Low/Medium/High) with color indicators
- **Permission Matrix Display**:
  - Tools with allow/deny/prompt badges
  - File access patterns (read/write/deny)
  - Network hosts (allowed/denied)
  - Execution permissions (shell/code)
- **Temporary Override Toggle**: One-time bypass for specific operations

Integrated into `apps/desktop/src/renderer/App.tsx`:
- Security level indicator in chat tab header (colored dot + label)
- Click to open Security Panel
- Security level state persisted per session

## Verification

Manual verification steps:

1. **High Security**: Start task with high security → every action prompts
2. **Medium Security**: Start task with medium → only file-write/shell prompts
3. **Low Security**: Start task with low → no prompts for allowed actions
4. **Denied Tool**: Try denied tool → blocked immediately with reason

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Deterministic Enforcement**: Security decisions are enforced in code, never in prompts (addresses research pitfall #2)
2. **Permission Matrix Architecture**: Clean separation of concerns with allow/deny/prompt tristate
3. **Role-Based Defaults**: Pre-defined roles reduce configuration burden while maintaining flexibility
4. **UI Integration**: Security panel accessible from chat header for quick adjustments

## Files Created/Modified

| File | Lines | Purpose |
|------|-------|---------|
| `apps/desktop/src/common/security.ts` | 194 | Types, roles, helpers |
| `apps/desktop/src/main/security-manager.ts` | 308 | Core security logic |
| `apps/desktop/src/renderer/components/SecurityPanel.tsx` | 265 | Security UI |
| `apps/desktop/src/main/storage.ts` | +120 | Roles table + operations |
| `apps/desktop/src/renderer/App.tsx` | +50 | Integration |

## Commits

- `10ac394600`: feat(03-01): define security levels and permission matrix
- `1e1d4282bf`: feat(03-01): build security manager core
- `616ad9610c`: feat(03-01): implement security panel UI

## Next Steps

Ready for Plan 03-02: Privacy Guard (path blocking, safe zones, suspicious pattern detection, audit logging)
