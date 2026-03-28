# Architecture Patterns: Desktop Multi-Agent AI Systems

**Domain:** Desktop Multi-Agent AI System (ClawHive)
**Researched:** 2026-03-28
**Confidence:** MEDIUM (based on OpenClaw SDK analysis + established patterns)

## Executive Summary

Desktop multi-agent AI systems require a layered architecture that separates concerns between:
1. **Presentation Layer** (Electron GUI, user interaction)
2. **Orchestration Layer** (agent hierarchy, task delegation)
3. **Agent Runtime Layer** (OpenClaw SDK integration)
4. **Security Layer** (sandbox, permissions, privacy guards)
5. **Infrastructure Layer** (storage, messaging, skills/MCP)

The ClawHive architecture builds on OpenClaw's proven agent runtime while adding hierarchical orchestration and team collaboration patterns.

## Recommended Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON FRONTEND                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Org Tree   │  │    Chat      │  │   Swarm      │  │    Progress     │  │
│  │   (Left)     │  │   (Right)    │  │    View      │  │     View        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     IPC Bridge (Main/Renderer)                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS (Node.js)                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    CLAWHIVE ORCHESTRATION CORE                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │
│  │  │   Agent      │  │   Task       │  │   Team       │  │   Plan    │  │ │
│  │  │   Registry   │  │   Router     │  │   Manager    │  │   Engine  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │
│  │  │   Security   │  │   Privacy    │  │   Report     │  │   Schedule│  │ │
│  │  │   Manager    │  │   Guard      │  │   Generator  │  │   Engine  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     OPENCLAW SDK INTEGRATION                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │
│  │  │   Agent      │  │   Skill      │  │    MCP       │  │  Session  │  │ │
│  │  │   Runtime    │  │   Loader     │  │   Registry   │  │  Manager  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Local      │  │   Knowledge  │  │   Browser    │  │   Model         │  │
│  │   Storage    │  │   Base       │  │   Control    │  │   Providers     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. Electron Frontend (Renderer Process)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **OrgTreeView** | Display hierarchical agent structure, drag-drop reordering | Main process via IPC |
| **ChatView** | Message rendering, input with file upload, model picker | Main process via IPC |
| **SwarmView** | Real-time team collaboration display, shared context | Main process via IPC |
| **ProgressView** | Task progress tracking, ambient glow effects | Main process via IPC |
| **SettingsView** | Agent config, security levels, knowledge base setup | Main process via IPC |

**IPC Contract:**
- Use Electron's `contextBridge` for secure preload script
- Async request/response pattern for agent operations
- Event streaming for real-time updates (swarm, progress)

### 2. Main Process - ClawHive Orchestration Core

#### Agent Registry
- **Responsibility:** CRUD for agents, role assignment, hierarchy management
- **Data Model:** Agent {id, name, role, parentId, permissions, modelConfig, skills[]}
- **Communicates With:** Task Router, Team Manager, OpenClaw Agent Runtime

#### Task Router
- **Responsibility:** Route tasks to appropriate agent(s) based on hierarchy and workload
- **Logic:** CEO/CFO/COO delegate to Department Heads → Team Leaders → Individual Agents
- **Communicates With:** Agent Registry, Plan Engine, OpenClaw Agent Runtime

#### Team Manager
- **Responsibility:** Manage team-level collaboration, shared memory, conversation sharing
- **Logic:** Sub-agents in same team share files/memories; cross-team requires approval
- **Communicates With:** Agent Registry, OpenClaw Session Manager

#### Plan Engine
- **Responsibility:** Plan-first mode - agents submit plans before execution
- **Logic:** Generate plan → User approval → Execute with checkpoints
- **Communicates With:** Task Router, OpenClaw Agent Runtime

#### Security Manager
- **Responsibility:** Per-task security levels, role-based permissions, approval workflows
- **Logic:** Block risky actions → Queue for approval → Log all decisions
- **Communicates With:** Privacy Guard, Task Router, OpenClaw Skill Loader

#### Privacy Guard
- **Responsibility:** Block sensitive paths, enforce safe zones, detect suspicious patterns
- **Logic:** Path allowlist/blocklist → Pattern detection → Alert + block
- **Communicates With:** Security Manager, Local Storage

#### Report Generator
- **Responsibility:** Assessment reports - team leaders review, parents aggregate
- **Logic:** Collect agent outputs → Generate summary → Escalate up hierarchy
- **Communicates With:** Agent Registry, Local Storage

#### Schedule Engine
- **Responsibility:** Recurring/scheduled tasks with team/agent selection
- **Logic:** Cron-like scheduling → Trigger task router → Log execution
- **Communicates With:** Task Router, Local Storage

### 3. OpenClaw SDK Integration Layer

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| **Agent Runtime** | Execute agent commands via OpenClaw SDK | Wraps `agentCommand` from OpenClaw |
| **Skill Loader** | Load skills per agent from npm/local sources | Uses OpenClaw skill system |
| **MCP Registry** | Manage MCP servers per agent | Uses OpenClaw MCP runtime |
| **Session Manager** | Manage agent sessions, transcripts | Uses OpenClaw session store |

**Integration Pattern:**
```typescript
// ClawHive wraps OpenClaw's agent runtime
class ClawHiveAgent {
  async executeTask(task: Task, context: AgentContext) {
    // 1. Apply security/policy checks
    await this.securityManager.validate(task);

    // 2. Build OpenClaw-compatible message
    const message = this.buildMessage(task, context);

    // 3. Call OpenClaw SDK
    const result = await agentCommand({
      message,
      agentId: this.id,
      workspaceDir: context.workspace,
      // ... other OpenClaw options
    });

    // 4. Process result for hierarchy/reporting
    return this.processResult(result);
  }
}
```

### 4. Infrastructure Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Local Storage** | SQLite + File system | Agent configs, transcripts, knowledge bases |
| **Knowledge Base** | Vector DB (local) + File watchers | Per-agent RAG with Obsidian/Notion integration |
| **Browser Control** | Playwright + MCP | Built-in browser + extension bridge |
| **Model Providers** | OpenClaw provider system | Anthropic, OpenAI, Grok, Ollama, etc. |

## Data Flow

### 1. User Sends Message to Agent

```
User Input (ChatView)
    ↓
IPC Bridge → Main Process
    ↓
Task Router (resolve target agent from hierarchy)
    ↓
Security Manager (validate security level)
    ↓
Privacy Guard (check path/content safety)
    ↓
Plan Engine (if plan-first mode: generate → approve → execute)
    ↓
OpenClaw Agent Runtime (execute with skills/MCP)
    ↓
Session Manager (persist transcript)
    ↓
Report Generator (if task complete, update parent reports)
    ↓
IPC Bridge ← Result
    ↓
ChatView (display response)
```

### 2. Multi-Agent Team Collaboration

```
CEO Agent delegates task to Marketing Team
    ↓
Team Manager creates shared workspace
    ↓
Task Router assigns sub-tasks to team members
    ↓
Each agent executes (OpenClaw Runtime)
    ↓
Team Manager aggregates shared context
    ↓
Team members can read shared files/memories
    ↓
Team Leader reviews outputs
    ↓
Report escalates to CEO
```

### 3. Scheduled Task Execution

```
Schedule Engine triggers
    ↓
Load task config + target agents
    ↓
Task Router (same flow as user-initiated)
    ↓
Execute without UI (background)
    ↓
Log results, generate reports
    ↓
Notify user if configured
```

## Patterns to Follow

### Pattern 1: Hierarchical Agent Resolution
**What:** Resolve agent hierarchy for task routing and reporting
**When:** Every task assignment, report generation
**Implementation:**
```typescript
interface AgentNode {
  id: string;
  role: 'ceo' | 'cfo' | 'coo' | 'department_head' | 'team_lead' | 'agent';
  parentId?: string;
  children: AgentNode[];
  permissions: PermissionSet;
}

class HierarchyResolver {
  getChainOfCommand(agentId: string): AgentNode[] {
    // Walk up parent chain to root
  }

  getTeamMembers(teamLeadId: string): AgentNode[] {
    // Get all descendants under team lead
  }
}
```

### Pattern 2: Sandboxed Skill Execution
**What:** Run skills in isolated context per agent
**When:** Loading/executing agent skills
**Implementation:**
```typescript
class SkillSandbox {
  async loadSkills(agentId: string, skillSpecs: SkillSpec[]) {
    // 1. Validate skills against allowlist
    // 2. Load in isolated Node.js context
    // 3. Apply security wrappers to all tool calls
    // 4. Return wrapped skill set
  }
}
```

### Pattern 3: Event-Driven State Synchronization
**What:** Keep UI in sync with agent state via events
**When:** Real-time collaboration, progress tracking
**Implementation:**
```typescript
// Main process emits
agentEvents.emit({
  type: 'agent_status_change',
  agentId: 'marketing-lead',
  status: 'working',
  progress: { current: 3, total: 10 }
});

// Renderer receives via IPC and updates UI
```

### Pattern 4: Checkpoint-Based Plan Execution
**What:** Plan-first mode with user approval at checkpoints
**When:** High-security tasks or when user enables plan-first
**Implementation:**
```typescript
interface Plan {
  steps: PlanStep[];
  checkpoints: number[]; // Step indices requiring approval
}

class PlanExecutor {
  async execute(plan: Plan, context: ExecutionContext) {
    for (const step of plan.steps) {
      if (plan.checkpoints.includes(step.index)) {
        const approved = await this.requestApproval(step);
        if (!approved) return { status: 'cancelled' };
      }
      await this.executeStep(step);
    }
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Renderer-to-Agent Communication
**What:** Bypassing main process for agent operations
**Why bad:** Security bypass, breaks sandbox, no audit trail
**Instead:** All agent operations go through main process orchestration layer

### Anti-Pattern 2: Shared State Between Agents
**What:** Agents directly accessing each other's memory/workspace
**Why bad:** Violates hierarchy, security boundaries unclear
**Instead:** Explicit shared workspaces managed by Team Manager

### Anti-Pattern 3: Synchronous Agent Execution
**What:** Blocking UI while agent runs
**Why bad:** Poor UX, can't show progress, can't cancel
**Instead:** Async execution with event streaming for real-time updates

### Anti-Pattern 4: Hardcoded Security Rules
**What:** Security logic scattered throughout code
**Why bad:** Inconsistent enforcement, hard to audit
**Instead:** Centralized Security Manager with policy-based rules

## Scalability Considerations

| Concern | At 10 Agents | At 100 Agents | At 1000 Agents |
|---------|--------------|---------------|----------------|
| **Hierarchy Resolution** | In-memory tree | Cached with LRU | Sharded by department |
| **Session Storage** | SQLite default | Connection pooling | Dedicated DB instance |
| **Knowledge Base** | Local vector DB | Indexed partitions | Distributed search |
| **Event Streaming** | IPC broadcast | Topic-based routing | Message queue (Redis) |
| **Task Queue** | In-memory queue | Persistent queue | Distributed task system |

## Build Order Implications

Based on component dependencies, suggested build order:

1. **Foundation Phase**
   - Local Storage layer (SQLite schema, file system)
   - OpenClaw SDK integration wrapper
   - IPC bridge (preload script, main/renderer communication)

2. **Core Runtime Phase**
   - Agent Registry (CRUD, basic hierarchy)
   - OpenClaw Agent Runtime integration
   - Basic Electron UI shell (org tree, chat view)

3. **Orchestration Phase**
   - Task Router
   - Security Manager (basic path blocking)
   - Privacy Guard (safe zones)
   - Plan Engine (basic mode)

4. **Collaboration Phase**
   - Team Manager
   - Shared workspaces
   - Swarm view UI
   - Report Generator

5. **Advanced Features Phase**
   - Schedule Engine
   - Knowledge Base integration
   - Browser control
   - MCP/Skill management UI

6. **Polish Phase**
   - i18n (English + Chinese)
   - Dark/light mode
   - Auto-update
   - Performance optimization

## Sources

- OpenClaw SDK analysis (`src/plugin-sdk/agent-runtime.ts`, `src/acp/control-plane/`)
- OpenClaw macOS app architecture (`apps/macos/Sources/OpenClaw/`)
- Project requirements (`.planning/PROJECT.md`)
