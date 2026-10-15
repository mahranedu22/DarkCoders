# OpenClaw Agents, Gateway & Skills Guide

This directory contains the complete OpenClaw infrastructure for the DarkCoders Voice Console assignment.

---

## 1. Running OpenClaw Gateway Natively (Without Docker)

You do **not** need Docker to run the OpenClaw Gateway. It runs directly via Node.js using the globally installed `openclaw` CLI.

### Command to start the Gateway:
```powershell
openclaw gateway run --allow-unconfigured --auth none --port 18789
```

### Verifying Gateway Health:
In a separate terminal or PowerShell prompt:
```powershell
Invoke-RestMethod -Uri "http://localhost:18789/health"
```
Output:
```json
{ "ok": true, "status": "live" }
```

---

## 2. Directory Layout

```text
openclaw/
├── README.md               # This guide
├── gateway.yaml            # Gateway server & model routing configuration
├── agents/                 # Custom OpenClaw agent definitions
│   ├── SOUL.md             # DevOps agent soul, voice demeanor & safety charter
│   ├── orchestrator.yaml   # Root intent classifier & conversational router
│   └── devops.yaml         # DevOps & incident response specialist
├── skills/                 # OpenClaw skill definitions & tool schemas
│   ├── ops-diagnostics/    # Host metrics via node:os (read-only, risk: none)
│   │   └── SKILL.md
│   └── ops-services/       # Service lifecycle & logs on services.json (risk: medium/high)
│       └── SKILL.md
└── state/                  # Persistent real state inspected and updated by tools
    ├── services.json       # Live registry of staging/prod services and builds
    └── service.log         # Append-only incident and operational audit log
```

---

## 3. Agents Roster

### Root Orchestrator (`agents/orchestrator.yaml`)
- Acts as the conversational front-door.
- Classifies user voice requests and delegates to domain specialists.
- Automatically routes infrastructure, crash investigation, logs, deployment, and restart inquiries to the `devops` specialist.

### DevOps Specialist (`agents/devops.yaml`)
- Specializes in staging infrastructure, SRE diagnostics, and incident remediation.
- Registered in the frontend voice settings (`src/lib/settings/voice.ts`) and 3D WebXR AgentRail.
- Follows strict **No Fake Data** and **Human-in-the-Loop** policies.

---

## 4. Real Tools & Safety Guardrails

| Tool Name | Type | Risk | Human Approval Needed? | Real Work Performed |
|---|---|---|---|---|
| `ops.system_diagnostics` | Read-only | `none` | **No** | Reads live CPU, memory, uptime, architecture directly via `node:os`. |
| `ops.list_services` | Read-only | `none` | **No** | Reads `services.json` on disk to inspect services and build states. |
| `ops.inspect_logs` | Read-only | `none` | **No** | Reads `service.log` with keyword/severity filtering. |
| `ops.deploy` | Mutation | `medium` | **YES** | Validates build status, checks service existence, refuses production deploys, updates `services.json`, appends audit trail to `service.log`. |
| `ops.restart_service` | Mutation | `high` | **YES** | Resets status to `running`, refreshes `lastRestart` timestamp in `services.json`, appends audit trail to `service.log`. |

---

## 5. Environment Variables (`.env`)

```ini
OPENCLAW_GATEWAY_URL="http://localhost:18789"
OPENCLAW_API_KEY=""
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.5-flash"
```
