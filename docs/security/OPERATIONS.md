# ClawHive Security Operations Guide

**Version:** 1.0
**Last Updated:** 2026-03-31
**Audience:** System Operators, Security Administrators

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuring Security Levels](#configuring-security-levels)
3. [Managing Safe Zones](#managing-safe-zones)
4. [Reviewing Audit Logs](#reviewing-audit-logs)
5. [Managing Roles and Permissions](#managing-roles-and-permissions)
6. [Incident Response](#incident-response)
7. [Security Monitoring](#security-monitoring)
8. [Best Practices](#best-practices)

---

## Getting Started

### Initial Security Setup

When you first launch ClawHive:

1. **Set Data Storage Path** — Choose a secure location for the database
2. **Review Default Safe Zones** — Workspace directory is auto-added
3. **Configure Default Security Level** — We recommend starting with "Medium"

### Security Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| Database | `~/.clawhive/data/clawhive.db` | SQLite with sessions, messages, audit log |
| Config | `~/.clawhive/config.json` | User preferences, safe zones |
| Logs | `~/.clawhive/logs/` | Application logs (not audit logs) |

---

## Configuring Security Levels

### Per-Task Security Levels

Set security level when creating a new session:

1. Open **Security Panel** (shield icon in chat header)
2. Select security level:
   - 🔴 **High** — All actions require approval
   - 🟡 **Medium** — Sensitive actions require approval (recommended)
   - 🟢 **Low** — Only denied actions blocked
3. Click **Apply to Session**

### Changing Security Level Mid-Session

You can change security level at any time:

1. Open Security Panel
2. Select new level
3. Choose **Apply to Current Session** or **Apply to Future Sessions**

**Note:** Changing to a lower security level does not retroactively approve pending actions.

### Security Level Guidelines

| Use Case | Recommended Level | Rationale |
|----------|-------------------|-----------|
| Exploratory coding | Low | Frequent file operations, no sensitive data |
| Project development | Medium | Balance of productivity and protection |
| Production deployments | High | All changes manually approved |
| Security audits | High | Maximum oversight |
| Unknown/untrusted agents | High | Precautionary principle |

---

## Managing Safe Zones

### What Are Safe Zones?

Safe zones are directories where agents can freely read and write files without triggering approval dialogs (at Medium security).

### Default Safe Zones

- `~/.clawhive/workspaces/<workspace-id>/` — Agent workspace

### Adding Safe Zones

**Via UI:**
1. Open **Settings** → **Privacy**
2. Scroll to **Safe Zones**
3. Click **Add Safe Zone**
4. Select or type directory path
5. Click **Save**

**Via Config File:**
```json
{
  "privacy": {
    "safeZones": [
      "~/Projects/my-project",
      "/var/log/allowed-logs"
    ]
  }
}
```

### Safe Zone Best Practices

✅ **Do:**
- Add project directories you actively work on
- Use absolute paths (tilde expansion supported: `~/`)
- Review safe zones periodically

❌ **Don't:**
- Add system directories (`/etc`, `/usr`, `~/.ssh`)
- Add parent directories containing sensitive subdirectories
- Add paths with symlinks to sensitive locations

### Removing Safe Zones

1. Open Settings → Privacy
2. Find the safe zone in the list
3. Click **Remove** (trash icon)

Removing a safe zone does not affect files already accessed — it only prevents future access without approval.

---

## Reviewing Audit Logs

### What Is Logged

The audit log records:
- Security decisions (allow/deny/prompt)
- User approvals and denials
- Suspicious pattern detection
- Circuit breaker triggers
- Configuration changes

### Viewing Audit Logs

**Via UI:**
1. Open **Settings** → **Privacy**
2. Scroll to **Audit Log**
3. Use filters:
   - **Date Range** — Last 24h, 7 days, 30 days, custom
   - **Decision** — All, Allowed, Denied, Prompted
   - **Action Type** — Tool, File, Network, Execution

**Via SQL:**
```sql
-- Recent denials
SELECT timestamp, action_type, reason
FROM activity_log
WHERE decision = 'deny'
ORDER BY timestamp DESC
LIMIT 10;

-- Suspicious activity
SELECT timestamp, action_details, metadata
FROM activity_log
WHERE action_type = 'suspicious_detected';
```

### Exporting Audit Logs

1. Open Settings → Privacy → Audit Log
2. Click **Export** (download icon)
3. Choose format: JSON or CSV
4. Select date range
5. Click **Download**

Exported logs include:
- Timestamp (Unix ms)
- Action type and details
- Decision (allow/deny/prompt)
- Reason for decision
- Metadata (JSON)

### Log Retention

- **Local storage:** Last 1000 entries (configurable in v1.1)
- **Export:** Unlimited (you control exported files)

**Recommendation:** Export logs monthly for compliance or analysis.

---

## Managing Roles and Permissions

### Default Roles

ClawHive includes four default roles:

| Role | Default Level | Shell | Use Case |
|------|--------------|-------|----------|
| **CEO Agent** | Medium | Prompt | Management, delegation |
| **CFO Agent** | Medium | Deny | Financial analysis |
| **Security Agent** | High | Prompt | Audits, security tasks |
| **Individual Agent** | Medium | Deny | General-purpose helper |

### Creating Custom Roles

1. Open **Settings** → **Agents** → **Roles**
2. Click **Create Role**
3. Configure:
   - **Name** — Unique identifier
   - **Default Security Level** — Recommended level
   - **Tool Permissions** — Allow/Deny/Prompt per tool
   - **File Access** — Read/Write patterns
   - **Network Access** — Allowed hosts
   - **Execution** — Shell and code permissions
4. Click **Save**

### Permission Matrix

Each permission can be:
- **Allow** — Action permitted without approval
- **Deny** — Action blocked, cannot be overridden
- **Prompt** — User approval required

**Example Matrix:**
```
Tools:
  fs.read: allow
  fs.write: prompt
  shell.exec: deny

Files:
  Read: ["~/.clawhive/workspaces/*", "~/Projects/*"]
  Write: ["~/.clawhive/workspaces/*"]
  Deny: ["~/.ssh/*", "~/.aws/*"]

Network:
  Allow: ["api.github.com", "*.openai.com"]
  Deny: ["localhost", "127.0.0.1", "10.*.*.*"]

Execution:
  Shell: prompt
  Code: allow
```

### Assigning Roles to Agents

1. Open **Agent Settings** (gear icon on agent)
2. Select **Role** dropdown
3. Choose role
4. Click **Save**

Changes take effect for new sessions. Existing sessions retain previous role.

### Role Inheritance (Phase 4+)

In multi-agent hierarchies:
- Sub-agents inherit parent restrictions
- Parent can further restrict, cannot relax
- CEO can delegate with limited permissions

---

## Incident Response

### Types of Security Incidents

| Severity | Examples | Response |
|----------|----------|----------|
| **Critical** | Credential access attempt, sandbox escape | Immediate session termination, revoke all tools |
| **High** | Repeated suspicious patterns, policy violations | Pause session, investigate, resume or terminate |
| **Medium** | Unexpected approval requests, network anomalies | Review logs, adjust security level |
| **Low** | Denied file access (legitimate), tool errors | Adjust safe zones or permissions |

### Immediate Response Actions

#### Pause Session

1. Open **Security Panel**
2. Click **Pause Session** (pause icon)
3. Session is immediately suspended
4. All pending actions are held

**Resume:**
1. Review held actions
2. Click **Resume** to continue
3. Or click **End Session** to terminate

#### Revoke Tool Access

Emergency tool revocation:

1. Open **Settings** → **Privacy** → **Tool Blacklist**
2. Click **Add Tool**
3. Enter tool name (e.g., `shell_exec`)
4. Click **Save**

Blacklisted tools are denied for all agents immediately.

#### Terminate Session

1. Open **Security Panel**
2. Click **End Session** (stop icon)
3. Confirm termination
4. Session is killed, no cleanup actions run

### Post-Incident Investigation

1. **Export Audit Log**
   - Settings → Privacy → Audit Log
   - Export incident time range

2. **Review Actions**
   - What was the agent trying to do?
   - Was it legitimate or malicious?
   - Did any action succeed?

3. **Assess Impact**
   - Were sensitive files accessed?
   - Was data exfiltrated?
   - Are credentials compromised?

4. **Adjust Security**
   - Lower security level? (if too many false positives)
   - Higher security level? (if suspicious activity)
   - Add/remove safe zones?
   - Modify role permissions?

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security@clawhive.ai with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow 72 hours for initial response

---

## Security Monitoring

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Denial rate | >20% of actions | >50% of actions |
| Approval pending time | >1 hour | >24 hours |
| Circuit breaker triggers | >1 per day | >5 per day |
| Suspicious pattern detection | >3 per session | >10 per session |
| Session count | >10 active | >50 active |

### Automated Monitoring (Future)

In v1.1+, configure alerts:

```json
{
  "securityAlerts": {
    "denialRateThreshold": 0.2,
    "suspiciousCountThreshold": 3,
    "webhookUrl": "https://hooks.slack.com/..."
  }
}
```

### Weekly Security Review Checklist

- [ ] Review audit log for denials and suspicious activity
- [ ] Check for sessions with high denial rates
- [ ] Verify safe zones are still appropriate
- [ ] Review and approve/deny any long-pending approvals
- [ ] Check for tool blacklist additions needed
- [ ] Update agent roles if responsibilities changed

---

## Best Practices

### For All Users

1. **Start with Medium security** — Only lower if productivity requires it
2. **Review every approval** — Don't blindly approve; understand what the agent is doing
3. **Use descriptive session names** — Helps track activity in logs
4. **Regularly export audit logs** — Monthly for compliance, weekly for high-security environments
5. **Keep app updated** — Security patches are released regularly

### For Power Users

1. **Customize roles** — Create roles for specific workflows
2. **Pre-configure safe zones** — Add common project directories
3. **Use high security for new agents** — Until you trust their behavior
4. **Monitor circuit breaker triggers** — Indicates potential infinite loops
5. **Blacklist unused dangerous tools** — Remove attack surface

### For Enterprise/Team Environments

1. **Centralized logging** — Export logs to SIEM (Splunk, ELK, etc.)
2. **Standardized roles** — Define organization-wide role templates
3. **Approval workflows** — Designate security approvers
4. **Regular audits** — Quarterly security reviews
5. **Incident response plan** — Document procedures for security events

---

## Troubleshooting

### Too Many Approval Prompts

**Problem:** Agent constantly asks for approval, disrupting workflow.

**Solutions:**
1. Lower security level to "Low" (for trusted agents)
2. Add project directory to safe zones
3. Adjust role permissions to allow specific tools
4. Use "Temporary Override" for one-time bypass

### Agent Cannot Access Files

**Problem:** Agent gets "Access denied" for legitimate files.

**Solutions:**
1. Check if path is in safe zones
2. Verify role has file read permission
3. Check Privacy Guard blocked patterns
4. Review audit log for specific denial reason

### Session Paused Unexpectedly

**Problem:** Session shows "Paused by circuit breaker."

**Causes:**
- 100 tool call limit reached
- Loop detected (3 identical calls)
- 10-minute execution time limit

**Resolution:**
1. Review what agent was doing
2. If legitimate, click **Resume**
3. If stuck in loop, click **End Session** and fix the prompt

### Cannot Change Security Settings

**Problem:** Security settings grayed out or changes not saving.

**Solutions:**
1. Ensure you have admin privileges
2. Check disk space for database writes
3. Verify database file is not locked
4. Restart application

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + S` | Open Security Panel |
| `Cmd/Ctrl + Shift + P` | Pause/Resume current session |
| `Cmd/Ctrl + ,` | Open Settings |

### File Locations

| Platform | Config Path | Data Path |
|----------|-------------|-----------|
| macOS | `~/.clawhive/config.json` | `~/.clawhive/data/` |
| Linux | `~/.config/clawhive/config.json` | `~/.local/share/clawhive/data/` |
| Windows | `%APPDATA%/ClawHive/config.json` | `%APPDATA%/ClawHive/data/` |

### Emergency Contacts

- **Security Issues:** security@clawhive.ai
- **General Support:** support@clawhive.ai
- **Documentation:** docs.clawhive.ai

---

*For technical security details, see [ARCHITECTURE.md](ARCHITECTURE.md) and [THREAT_MODEL.md](THREAT_MODEL.md)*
