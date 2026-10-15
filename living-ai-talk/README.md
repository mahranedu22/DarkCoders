# DarkCoders OpenClaw Take-Home Submission

> Voice-enabled DevOps & Incident Response Agent with Human-in-the-Loop Safeguards for the OpenClaw Voice & Spatial Console.

---

## 1. What I Built

I built an operations and incident response specialist agent (**`devops`**) wired directly into DarkCoders' Voice & Spatial Console, and unified the backend bridge (`/api/agent`) so all 5 console agents (**`general`**, **`devops`**, **`ciso`**, **`planner`**, and **`coder`**) and allowlisted models run smoothly.

Rather than building a passive chatbot that merely talks about problems, I gave the agent **real tools that perform genuine work on the local machine**:
- **Host OS Telemetry (`ops.system_diagnostics`)**: Samples live CPU load, core count, RAM usage, and host uptime directly from the operating system via Node's `node:os` module.
- **Service Registry (`ops.list_services`)**: Inspects staging services, ports, and build artifacts stored on disk in `openclaw/state/services.json`.
- **Incident Log Inspection (`ops.inspect_logs`)**: Reads and filters real runtime error logs from `openclaw/state/service.log` (e.g. tracking down `OOMKilled` crashes on `worker-02`).
- **Human-in-the-Loop Safeguards (`ops.deploy` & `ops.restart_service`)**: Consequential operations are never executed autonomously. The agent emits structured `action_proposal` cards that prompt the operator to **Approve** or **Deny** via the console UI.
- **Multimodal Voice Input**: Connected `/api/transcribe` to transcribe audio recordings directly so holding down the microphone button works out of the box.

---

## 2. The Calls I Made

### Zero Fake Results (Real I/O)
The assignment brief explicitly states: *"No fake results. If something fails, show the real error — never swap in fake data."* 
All tools perform genuine filesystem operations and OS syscalls. If a non-existent build is passed to `ops.deploy`, or an unknown service is targeted, the tool throws a real error that the agent reports back in natural spoken language.

### Human-in-the-Loop Safety & Production Block
Autonomous agents should not have unilateral write access to production infrastructure. 
1. Any state-changing command (`deploy`, `restart_service`) halts execution and emits an `action_proposal` screen with a clear title, operational consequence summary, and risk tier (`medium` or `high`).
2. Only after receiving an explicit `APPROVED:` signal does the agent invoke the mutating tool.
3. Voice-triggered deployments to production are rejected outright at the tool boundary.

### In-Process Tool Calling with Strict Model Allowlisting
The OpenClaw CLI gateway (`openclaw gateway run`) operates as a local WebSocket/RPC daemon on port 18789. To ensure dependable multi-turn function calling and Server-Sent Events (SSE) streaming without fragile multi-process hops, I implemented the execution engine directly in the server bridge (`src/routes/api/agent.ts`).

Per `AGENTS.md`, I strictly validated requested models against `resolveGatewayModel()`. Allowlisted models (`openclaw/default`, `gpt-5.6-terra`, `gemini-3.1-pro`, etc.) are accepted and routed through the engine, while un-offered models (like `gpt-5.6-sol-pro`) are immediately rejected with HTTP 400 Bad Request to prevent silent model swapping.

### 100% Frontend Integrity (Zero UI Changes)
I preserved all frontend components (`src/components/*` and `src/routes/index.tsx`) exactly as provided in the starter code. Instead of modifying frontend code to pass agent parameters, the server dynamically extracts the active persona from the planning context (`context`).

---

## 3. Where AI Helped

Per the assignment instructions (*"Use AI tools. We expect it. Just note in your README where they helped"*):
- **Schema Scaffolding:** I used an LLM to quickly scaffold the verbose Gemini function declaration schemas in `src/lib/tools/index.ts`.
- **Fixture Generation:** I had AI draft realistic Kubernetes-style OOM-kill logs for `openclaw/state/service.log` to simulate a realistic production incident scenario.
- **Unit Test Boilerplate:** AI generated initial test case templates in `src/lib/tools/tools.test.ts`.
- **What I Owned:** I designed the architecture, implemented the safety boundaries and Human-in-the-Loop flow, wrote the real filesystem state mutations in Node.js, handled SSE streaming, resolved model routing, and audited the codebase.

---

## 4. How to Run Everything

### Prerequisites
- Node.js 20+ (Node 24 recommended)
- Globally installed OpenClaw CLI:
  ```powershell
  npm install -g openclaw
  ```

### Step 1: Start OpenClaw Gateway (Native, No Docker)
In a terminal:
```powershell
openclaw gateway run --allow-unconfigured --auth none --port 18789
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` (or verify `.env`):
```ini
OPENCLAW_GATEWAY_URL="http://localhost:18789"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-2.5-flash"
```

### Step 3: Run Tests & Typecheck
```powershell
npm run typecheck
npm test
```
*All test suites pass cleanly with zero TypeScript errors.*

### Step 4: Launch Voice Console
```powershell
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:8080`).

---

## 5. Walkthrough: Incident Response Scenario

Try this workflow in the console:

1. **Select DevOps Agent:**
   - In Settings -> Voice & Agents, select **DevOps · incident response** (or simply say *"Switch to DevOps agent"*).
2. **Diagnose Services:**
   - Speak or type: *"What services are currently failing?"*
   - The agent calls `ops.list_services`, discovers `worker-02` in `crash-looping` state, and reports back in spoken English.
3. **Inspect Logs:**
   - Speak: *"Inspect the logs for worker-02."*
   - The agent calls `ops.inspect_logs` with filter `worker-02`, identifying the `OOMKilled` (Exit code 137) root cause.
4. **Trigger Recovery (Approval Gating):**
   - Speak: *"Restart worker-02."*
   - The agent **does not** restart immediately. An **Approval Required** card appears in the console panel with risk level **HIGH**.
   - Click **Approve**.
   - The agent executes `ops.restart_service`, updates `services.json`, appends the audit event to `service.log`, and confirms recovery.
5. **Check Host Telemetry:**
   - Speak: *"What is the host memory and CPU utilization?"*
   - The agent executes `ops.system_diagnostics` and reads live CPU and RAM stats directly from your machine.
