---
name: ops-diagnostics
version: 1.0.0
description: System health inspection and resource telemetry for local host and staging environments.
risk: none
tools:
  - ops.system_diagnostics
---

# OpenClaw Skill: Operations Diagnostics (`ops-diagnostics`)

This skill provides read-only inspection tools for host telemetry and cluster health. All operations sample genuine OS syscalls via Node.js `node:os`.

## Tool Specifications

### `ops.system_diagnostics`

Collects real-time OS metrics directly from the host operating system.

- **Risk Level:** `none` (Read-only, autonomous execution permitted)
- **Requires Approval:** `false`
- **Execution Target:** `src/lib/tools/system-diagnostics.ts`

#### Input Schema
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "hostname": { "type": "string" },
    "platform": { "type": "string" },
    "arch": { "type": "string" },
    "nodeVersion": { "type": "string" },
    "uptime": {
      "type": "object",
      "properties": {
        "system": { "type": "number" },
        "process": { "type": "number" },
        "human": { "type": "string" }
      },
      "required": ["system", "process", "human"]
    },
    "cpu": {
      "type": "object",
      "properties": {
        "model": { "type": "string" },
        "cores": { "type": "number" },
        "speed": { "type": "number" },
        "loadPercent": { "type": "number" }
      },
      "required": ["model", "cores", "loadPercent"]
    },
    "memory": {
      "type": "object",
      "properties": {
        "totalGB": { "type": "number" },
        "usedGB": { "type": "number" },
        "freeGB": { "type": "number" },
        "usedPercent": { "type": "number" }
      },
      "required": ["totalGB", "usedGB", "freeGB", "usedPercent"]
    },
    "loadAverage": {
      "type": "array",
      "items": { "type": "number" }
    }
  },
  "required": ["hostname", "platform", "uptime", "cpu", "memory"]
}
```

## Execution Guarantees
- **No Fake Data:** All telemetry is read directly from host OS syscalls via `node:os`.
- **Non-blocking:** Asynchronous sampling avoids stalling the event loop.
