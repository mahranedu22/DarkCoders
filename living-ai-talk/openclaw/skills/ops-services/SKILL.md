---
name: ops-services
description: Staging service lifecycle management, log inspection, and human-in-the-loop deployment and restarts.
risk: medium-to-high
---

# OpenClaw Skill: Operations Services (`ops-services`)

This skill provides service registry inspection, log reading, and controlled state mutations on `openclaw/state/services.json` and `openclaw/state/service.log`.

## Tools Provided

### 1. `ops.list_services`
- **Description**: Inspects current registered services and available builds on disk.
- **Parameters**:
  - `status` (string, optional): Filter by status (e.g. `running`, `crash-looping`, `stopped`).
- **Risk**: `none` (Read-only, no approval needed).

### 2. `ops.inspect_logs`
- **Description**: Inspects recent entries from `service.log` with keyword or severity filtering.
- **Parameters**:
  - `lines` (number, optional, 1-100, default 20): Number of recent entries to retrieve.
  - `filter` (string, optional): Case-insensitive keyword or severity filter (e.g. `OOMKilled`, `worker-02`, `ERROR`).
- **Risk**: `none` (Read-only, no approval needed).

### 3. `ops.deploy`
- **Description**: Updates the deployed build version for a staging service.
- **Parameters**:
  - `service` (string, required): Target service name.
  - `version` (string, required): Build version to deploy (must exist in builds list and be `ready`).
- **Risk**: `medium` (State-changing).
- **Safety Policy**:
  - Requires human approval (`action_proposal` screen).
  - Enforces build readiness check.
  - Enforces production deployment block (only staging allowed via voice).
  - Appends audit entry to `service.log` upon execution.

### 4. `ops.restart_service`
- **Description**: Gracefully resets a service status to `running` and logs the action.
- **Parameters**:
  - `service` (string, required): Service to restart.
  - `reason` (string, optional): Justification recorded in log.
- **Risk**: `high` (Destructive/state-changing).
- **Safety Policy**:
  - Requires human approval (`action_proposal` screen).
  - Updates service status and timestamp in `services.json`.
  - Appends audit entry to `service.log`.
