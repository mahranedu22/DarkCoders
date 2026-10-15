---
name: ops-diagnostics
description: System health inspection and resource telemetry for local host and staging environments.
risk: none
---

# OpenClaw Skill: Operations Diagnostics (`ops-diagnostics`)

This skill provides read-only inspection tools for host telemetry and cluster health.

## Tools Provided

### `ops.system_diagnostics`
- **Description**: Collects real-time OS metrics directly from Node.js `node:os` runtime.
- **Parameters**: None.
- **Data returned**:
  - `hostname`, `platform`, `arch`, `nodeVersion`
  - `uptime`: Real host uptime (seconds and humanized) and process uptime
  - `cpu`: Model name, core count, average load percentage, per-core utilization
  - `memory`: Total GB, used GB, free GB, percentage usage
  - `loadAverage`: 1, 5, and 15-minute system load averages
- **Risk**: `none` (safe to execute without approval).

## Execution Guarantees
- Zero synthetic data: all metrics are sampled directly from host syscalls.
- Non-blocking asynchronous sampling.
