---
name: ops-services
version: 1.0.0
description: Staging service lifecycle management, log inspection, and human-in-the-loop deployment and restarts.
risk: medium-to-high
tools:
  - ops.list_services
  - ops.inspect_logs
  - ops.deploy
  - ops.restart_service
stateFiles:
  - openclaw/state/services.json
  - openclaw/state/service.log
---

# OpenClaw Skill: Operations Services (`ops-services`)

This skill provides service registry inspection, audit log reading, and controlled state mutations on staging services stored on disk.

---

## Tool Specifications

### 1. `ops.list_services`

Inspects registered services, current status, environment, deployed version, and available builds from `openclaw/state/services.json`.

- **Risk Level:** `none` (Read-only)
- **Requires Approval:** `false`
- **Execution Target:** `src/lib/tools/list-services.ts`

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Optional status filter (e.g., 'running', 'crash-looping', 'stopped')"
    }
  },
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "services": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "status": { "type": "string" },
          "environment": { "type": "string" },
          "version": { "type": "string" },
          "port": { "type": "number" },
          "lastRestart": { "type": "string" }
        },
        "required": ["name", "status", "environment", "version"]
      }
    },
    "builds": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "version": { "type": "string" },
          "commit": { "type": "string" },
          "status": { "type": "string" }
        },
        "required": ["version", "status"]
      }
    }
  },
  "required": ["services"]
}
```

---

### 2. `ops.inspect_logs`

Reads recent entries from `openclaw/state/service.log` with optional keyword or severity filtering.

- **Risk Level:** `none` (Read-only)
- **Requires Approval:** `false`
- **Execution Target:** `src/lib/tools/inspect-logs.ts`

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "lines": {
      "type": "number",
      "description": "Number of recent log lines to retrieve (1-100, default: 20)"
    },
    "filter": {
      "type": "string",
      "description": "Case-insensitive keyword or severity filter (e.g., 'OOMKilled', 'worker-02', 'ERROR')"
    }
  },
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "lines": {
      "type": "array",
      "items": { "type": "string" }
    },
    "total": { "type": "number" },
    "filter": { "type": "string" }
  },
  "required": ["lines", "total"]
}
```

---

### 3. `ops.deploy`

Updates the deployed build version for a staging service in `services.json` and appends an audit record to `service.log`.

- **Risk Level:** `medium` (State-changing)
- **Requires Approval:** `true` (Triggers `action_proposal` screen)
- **Execution Target:** `src/lib/tools/deploy.ts`

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "service": {
      "type": "string",
      "description": "Target service name (e.g. 'worker-01', 'api-gateway')"
    },
    "version": {
      "type": "string",
      "description": "Build version to deploy (must exist in builds registry with status 'ready')"
    }
  },
  "required": ["service", "version"],
  "additionalProperties": false
}
```

#### Safety Rules:
1. **Human-in-the-Loop Gating:** Never executes without operator consent. Emits an `action_proposal` card with `risk: "medium"`.
2. **Production Block:** Refuses deployment if the service has `environment === "production"`.
3. **Artifact Integrity:** Verifies the requested version exists in the builds registry and has `status === "ready"`.

---

### 4. `ops.restart_service`

Gracefully resets a service status to `running`, updates the `lastRestart` timestamp, and appends an incident audit entry to `service.log`.

- **Risk Level:** `high` (Lifecycle mutation)
- **Requires Approval:** `true` (Triggers `action_proposal` screen)
- **Execution Target:** `src/lib/tools/restart-service.ts`

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "service": {
      "type": "string",
      "description": "Name of the service to restart (e.g. 'worker-02')"
    },
    "reason": {
      "type": "string",
      "description": "Operational justification recorded in the audit log"
    }
  },
  "required": ["service"],
  "additionalProperties": false
}
```

#### Safety Rules:
1. **Human-in-the-Loop Gating:** Never restarts services without operator consent. Emits an `action_proposal` card with `risk: "high"`.
2. **Audit Logging:** Logs the restart timestamp, user reason, and outcome to `service.log`.
