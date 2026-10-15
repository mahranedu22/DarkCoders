# OpenClaw Voice Console: DevOps & SRE Commander

## Overview
For this assignment, I built the **DevOps Command Center** agent. Operations is one of the most practical use cases for a voice-first UI (e.g., triage while on-call/away from the keyboard). 

This agent interacts with real system environments, performs read-only diagnostics instantly, and strictly enforces human-in-the-loop (HITL) approvals for any state-changing or destructive actions.

## 🛠 What I Built
Instead of a generic chatbot, I implemented a strict, tool-calling DevOps orchestrator. 

**Key Features:**
1. **Real Data, Zero Mocks:** Adhering strictly to the "No fake results" rule, the read tools use `node:os` and `node:fs` to pull real host CPU/Memory telemetry and read actual log files from the disk.
2. **Strict Approval Gate:** Read operations execute immediately. However, state-changing tools (like `ops_restart_service` or `ops_deploy_version`) are blocked at the execution layer. The agent is forced to return an `action_proposal` to the UI, awaiting explicit human approval before actually modifying the `services.json` state or writing to logs.
3. **Live Thinking Steps:** Tool execution is streamed back to the frontend using `response.reasoning_summary_text.delta` to give the operator real-time feedback on what the agent is doing behind the scenes.

## 🏗 Architecture & Trade-offs
The assignment was designed to interface with an external OpenClaw Gateway. 

**The Trade-off:**
Due to local environment constraints (Docker build timeouts and disk space limits on my machine), running a full separate OpenClaw Gateway container via Docker wasn't feasible in the given timeframe. 

**The Solution:**
To ensure a robust, fast, and 100% working demo, I embedded the tool-execution loop and Gemini API communication directly into the `src/routes/api/agent.ts` bridge. 
However, to demonstrate my understanding of the OpenClaw architecture, I have provided the complete standard structure inside the `openclaw/` directory (`gateway.yaml`, `agents/`, `skills/`). This directory represents exactly how this agent would be configured in a production OpenClaw Gateway environment.

## 🚀 How to Run (Lightweight Mode)
1. Install dependencies:
   ```bash
   npm install
Create .env from the example and add your Gemini API Key:

Bash
cp .env.example .env
# Add: GEMINI_API_KEY="your_api_key_here"
Start the dev server:

Bash
npm run dev
Ask the agent: "Check system telemetry and read the latest logs" (Executes directly).

Ask the agent: "Restart worker-02" (Triggers the Approval Panel).

🤖 AI Usage Disclosure
As per the assignment guidelines, I utilized AI tools (Gemini / Code Assistants) to:

Quickly parse the provided repository structure and trace the SSE streaming logic.

Scaffold boilerplate TypeScript interfaces for the tools.

Draft the initial JSON schema requirements for the system prompt.

The core architectural decisions, the strict separation of read/write tools, and the embedded execution loop logic were entirely my own design.
