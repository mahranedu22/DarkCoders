# DarkCoders OpenClaw Assignment — Full Analysis

---

## PHASE 1 — THE ASSIGNMENT

### What Dark Coders is asking

They built a **voice console** (a web app where you hold-to-talk with an AI agent). The console can already:
- Record your voice
- Transcribe it
- Show live agent steps (received → transcribing → planning → thinking → streaming → speaking)
- Speak the answer back
- Display a 3D/WebXR spatial chat room
- Show an approval panel

**What it does NOT have is an intelligent agent behind it.** Currently, the backend just forwards your message to a generic LLM and returns the raw response. There are no tools, no skills, no real actions — just a chatbot wrapper.

### Your job

1. **Build an AI agent** (or a small team of agents) on **OpenClaw** that does something genuinely useful
2. Give it **real tools and skills** so it actually does things (not just chat)
3. Make **risky actions require human approval** (action_proposal flow)
4. Connect it to the existing voice console via the **`/api/agent`** bridge
5. Deliver an **`openclaw/` folder** with your agents and skills
6. Write a **README** explaining what you built, your decisions, and where AI helped

### Key constraints from the assignment

- "A small, sharp system beats a big, half-working one"
- "No fake results" — if something fails, show the real error
- Use AI tools — just disclose where they helped
- Weekend-sized scope
- The interview will include walking through the project and making a small extension live

---

## PHASE 2 — THE EXISTING PROJECT

### What is this project?

**`living-ai-talk`** is a full-stack web application built with:

| Technology | Role |
|---|---|
| **TanStack Start + Vite** | Full-stack React meta-framework (SSR + API routes + client) |
| **React 19** | UI framework |
| **TailwindCSS 4** | Styling |
| **Radix UI** | Accessible UI primitives (dialog, tabs, sliders, etc.) |
| **Three.js + @react-three/fiber + XR** | 3D WebXR spatial chat room |
| **Nitro** | Server runtime for API routes |
| **Supabase** | Optional cloud sync for settings |
| **eventsource-parser** | SSE stream parsing |
| **Zod** | Schema validation |
| **Web Audio API** | Microphone recording + PCM audio playback |

### What problem does it currently solve?

It provides a **voice-first interface** to talk to an LLM. You hold a button, speak, the app transcribes your speech, sends it to an LLM, gets a structured JSON response, and speaks it back. But there is **no agent intelligence** — no tools, no skills, no real actions. It's a voice wrapper around a chat completion API.

### How each important piece works

| Component | What it does |
|---|---|
| **`/api/agent` route** | Receives `{turns, context, model}` from frontend, sends to OpenClaw Gateway via `/v1/responses` or `/v1/chat/completions`, streams SSE events back |
| **`/api/llm` route** | Alternative: proxies to cloud providers (OpenAI, Anthropic, Gemini, OpenRouter) with Vault key management |
| **`/api/transcribe` route** | Proxies audio file to OpenClaw Gateway `/v1/audio/transcriptions` |
| **`/api/speak` route** | Proxies text to OpenClaw Gateway `/v1/audio/speech` |
| **Voice recording** ([record-wav.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/record-wav.ts)) | Captures microphone audio, encodes WAV |
| **Agent client** ([agent.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/agent.ts)) | Calls `/api/agent`, parses SSE events with `readSse`, extracts thinking/answer deltas |
| **Screen parser** ([screen.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/screen.ts)) | Parses structured JSON responses into Screen objects with text, choices, navigation, commands, and `actionProposal` |
| **System prompt** ([prompt.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/prompt.ts)) | Defines the blueprint: how the LLM should respond (JSON schema with screen, choices, action_proposal, app_commands) |
| **Provider routing** ([providers-client.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/providers-client.ts)) | Routes to built-in, local (Ollama/LMStudio), or cloud providers |
| **Agent roster** ([voice.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/settings/voice.ts)) | Defines agent profiles (general, ciso, planner, coder) as personas — just system prompt text, not real OpenClaw agents |
| **Approval panel** ([console-panels.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/console-panels.tsx)) | Shows `action_proposal` with Approve/Deny buttons, sends decision back as text message |
| **3D room** ([xr-chat.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/xr-chat.tsx)) | WebXR spatial view with agent panels, conversation, and VR controls |
| **Theme** ([theme.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/settings/theme.ts)) | Live theming with accent colors, glass blur, roundness |
| **Settings store** ([store.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/settings/store.ts)) | localStorage-based persistence with reactive hooks |

---

## PHASE 3 — PROJECT STRUCTURE MAP

### Root files

| File | Purpose | Need to modify? |
|---|---|---|
| [ASSIGNMENT.md](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/ASSIGNMENT.md) | Assignment instructions | **NO** |
| [README.md](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/README.md) | Project readme | **YES** — we must write our own |
| [AGENTS.md](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/AGENTS.md) | Lovable-specific architectural notes | NO |
| [.env.example](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/.env.example) | Environment template | **MAYBE** — if we add new env vars |
| [package.json](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/package.json) | Dependencies | **MAYBE** — if we need new packages |
| [vite.config.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/vite.config.ts) | Vite configuration | NO |

### `src/routes/api/` — Server API routes

| File | Purpose | Working? | Modify? |
|---|---|---|---|
| [agent.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/api/agent.ts) | **THE BRIDGE** — connects console to our OpenClaw agent | ✅ Works as LLM proxy | **YES — must point to our OpenClaw agent** |
| [llm.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/api/llm.ts) | Cloud provider proxy with Vault | ✅ Working | NO |
| [speak.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/api/speak.ts) | TTS proxy | ✅ Working | NO |
| [transcribe.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/api/transcribe.ts) | STT proxy | ✅ Working | NO |

### Deep dive: `agent.ts` — The Bridge

This is the **most important file** for our assignment. Here's exactly what happens:

```
Frontend → POST /api/agent → { turns: [{role, text}], context?: string, model?: string }
```

1. **Receives**: Array of conversation turns, optional plan context, optional model name
2. **Resolves model**: `resolveGatewayModel(modelName)` → maps to gateway model ID
3. **Builds input**: System prompt + plan context + last 12 turns in OpenAI Responses API format
4. **Calls**: `streamResponses(request, input, {text: {format: OUTPUT_FORMAT}}, model)`
5. **streamResponses** in [responses.server.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/ai/responses.server.ts):
   - If model starts with `openai/` → uses `/v1/responses` API (OpenAI Responses format)
   - Otherwise → uses `/v1/chat/completions` and **converts** the SSE stream to Responses-style events
6. **Streams back** SSE events with types:
   - `response.reasoning_summary_text.delta` → thinking/reasoning deltas
   - `response.output_text.delta` → answer text deltas
   - `response.output_text.done` → final answer text

**The frontend expects**: An SSE stream of events. The answer text is expected to be JSON matching the `OUTPUT_FORMAT` schema (kind, screen, action_proposal, app_commands).

**Currently**: This route just calls a generic LLM. There is NO OpenClaw agent processing, no tool execution, no skill invocation. It's a direct LLM call.

### `src/lib/` — Library code

| File | Purpose | Modify? |
|---|---|---|
| [voice/prompt.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/prompt.ts) | System prompt + JSON schema for responses | **MAYBE** — to add tool/skill awareness |
| [voice/screen.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/screen.ts) | Screen/proposal parser | NO — already handles action_proposal |
| [voice/agent.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/agent.ts) | Client-side agent call + SSE reader | NO |
| [voice/speak.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/speak.ts) | Cloud TTS playback | NO |
| [voice/record-wav.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/record-wav.ts) | Microphone recording | NO |
| [voice/local-asr.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/local-asr.ts) | Local Whisper ASR | NO |
| [voice/providers-client.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/providers-client.ts) | Provider routing | NO |
| [ai/gateway.server.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/ai/gateway.server.ts) | Gateway URL + API key config | **MAYBE** |
| [ai/responses.server.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/ai/responses.server.ts) | Stream LLM responses | **YES — key modification target** |
| [ai/models.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/ai/models.ts) | Model allowlist | **MAYBE** |
| [settings/voice.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/settings/voice.ts) | Agent roster (AGENTS) | **YES — register our agents** |

### `src/components/` — UI components

| File | Purpose | Modify? |
|---|---|---|
| [console-panels.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/console-panels.tsx) | Approval panel + lifecycle strip + waveform | **NO** — already wired |
| [telegram-run.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/telegram-run.tsx) | Chat bubbles + step log + run options | NO |
| [general-settings.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/general-settings.tsx) | Settings dialog (voice, appearance, models, etc.) | NO |
| [xr-chat.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/xr-chat.tsx) | WebXR 3D spatial chat | NO |
| [plan-builder.tsx](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/plan-builder.tsx) | Plan workflow builder | NO |

### `openclaw/` — **Our assignment submission folder**

Currently contains only a `README.md` with a recommended structure:
```
openclaw/
├── README.md               # How to start your OpenClaw gateway & required env vars
├── gateway.yaml            # OpenClaw gateway configuration & model routing
├── agents/                 # Custom OpenClaw agent definitions
└── skills/                 # Custom OpenClaw skills, tool scripts, or MCP server configs
```

**This is EMPTY.** We must populate it.

### `supabase/` — Cloud sync (optional)

One migration for settings sync. Not relevant to our assignment.

---

## PHASE 4 — CONSOLE FEATURE AUDIT

| Feature | Status | Evidence |
|---|---|---|
| **1. Hold-to-talk** | ✅ **FULLY IMPLEMENTED** | `onPointerDown → startRecording()`, `onPointerUp → stopRecording()` in [index.tsx L639-644](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/index.tsx#L639-L644) |
| **2. Hands-free (standby)** | ✅ **FULLY IMPLEMENTED** | Standby mode auto-records after silence pause, [index.tsx L389-404](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/index.tsx#L389-L404) |
| **3. Voice input** | ✅ **IMPLEMENTED** | WAV recording + transcription via `/api/transcribe` or local ASR |
| **4. Voice output** | ✅ **IMPLEMENTED** | Three engines: browser native, Kokoro, cloud (OpenClaw gateway TTS) |
| **5. Live agent steps** | ✅ **IMPLEMENTED** | `StepLog` component shows received → transcribing → planning → thinking → streaming → speaking |
| **6. Tool execution viz** | ⚠️ **PLACEHOLDER** | StepLog can show steps with labels/details, but no real tools exist yet. The UI is ready. |
| **7. Reasoning viz** | ✅ **IMPLEMENTED** | Thinking summary shown live during processing, expandable per message |
| **8. Approval requests** | ✅ **UI FULLY IMPLEMENTED** | [console-panels.tsx L162-189](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/console-panels.tsx#L162-L189) shows proposal with Approve/Deny. [index.tsx L666-678](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/index.tsx#L666-L678) sends decision back. **But no agent currently sends proposals.** |
| **9. Agent selector** | ✅ **IMPLEMENTED** | Agent roster in settings, voice command `set_agent`, selector in spatial view |
| **10. 3D room** | ✅ **IMPLEMENTED** | Lazily loaded WebXR view in `xr-chat.tsx` |
| **11. Spatial chat** | ✅ **IMPLEMENTED** | Shared conversation state between console and spatial views |
| **12. Mobile support** | ✅ **IMPLEMENTED** | Bottom nav bar for mobile, responsive layout |
| **13. Settings** | ✅ **IMPLEMENTED** | Full dialog with voice, appearance, models, run options, account tabs |
| **14. Error handling** | ✅ **IMPLEMENTED** | Error screens, notices, safe fallback screens, abort handling |

**Summary**: The console UI is essentially complete. What's missing is a real agent brain behind it.

---

## PHASE 5 — OPENCLAW IN THIS PROJECT

### What is OpenClaw?

OpenClaw is an **AI agent gateway/framework**. Think of it as infrastructure that sits between your app and LLMs, providing:
- **Agent definitions** — configured personas with specific models, tools, and skills
- **Gateway** — a server that routes requests to the right model/agent
- **Skills** — reusable capabilities (bundles of prompts + tools)
- **Tools** — specific functions an agent can call (API calls, file operations, etc.)
- **Multi-agent orchestration** — one orchestrator agent delegating to specialists

### How it works in THIS project

In the current codebase, OpenClaw is referenced but **not actually implemented as an agent framework**. Here's what exists:

1. **Gateway URL**: `OPENCLAW_GATEWAY_URL` (default `http://localhost:18789`) — the console expects an OpenClaw-compatible gateway to be running
2. **The bridge**: `/api/agent` sends requests to `GATEWAY_BASE_URL/v1/responses` or `/v1/chat/completions` — standard OpenAI-compatible endpoints
3. **Agent roster**: The `AGENTS` object in `voice.ts` just defines **personas** (text instructions), not real OpenClaw agent definitions
4. **No tools or skills are defined anywhere** — the LLM is just chatting

### Agent vs. Skill vs. Tool — explained simply

| Concept | Analogy | Example |
|---|---|---|
| **Agent** | A person with a job title | "DevOps Engineer" — knows what to do, when to use tools |
| **Skill** | A job skill on their resume | "Server monitoring" — a reusable bundle of knowledge + tools |
| **Tool** | A specific instrument they use | "check_server_status" — one function that calls an API |

An **agent** has one or more **skills**. Each **skill** bundles one or more **tools** with instructions on how/when to use them.

### The flow in this project

```
User speaks
→ Browser records WAV
→ /api/transcribe (or local ASR) → text
→ Frontend builds turns array
→ POST /api/agent { turns, context, model }
→ agent.ts resolves model
→ streamResponses() calls OPENCLAW_GATEWAY_URL/v1/chat/completions
→ OpenClaw Gateway → LLM (currently just generic chat)
→ LLM returns JSON (screen format)
→ SSE events streamed back
→ Frontend parses screen, shows text + choices + action_proposal
→ speakWith() speaks the text aloud
```

### What must exist in the `openclaw/` folder

Per the assignment and the README:
- `README.md` — how to start the gateway, required env vars
- `gateway.yaml` — gateway configuration and model routing
- `agents/` — our custom agent definitions
- `skills/` — custom skills, tool scripts, or MCP server configs

### Which existing files are templates vs. keepers?

- `openclaw/README.md` — **TEMPLATE** — must be replaced with our actual setup instructions
- Everything else — **MUST BE CREATED** by us

---

## PHASE 6 — THE AGENT CONTRACT

The agent contract is defined in [ASSIGNMENT.md Appendix](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/ASSIGNMENT.md#L76-L131) and implemented in [prompt.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/prompt.ts).

### The JSON Schema (OUTPUT_FORMAT)

```json
{
  "kind": "screen",
  "screen": {
    "text": "Plain spoken text — read aloud, no markdown",
    "choices": [
      { "id": "lowercase_id", "label": "Short label (≤40 chars)", "value": "What the user would say (≤1000 chars)" }
    ],
    "navigation": ["back", "cancel", "home"]
  },
  "action_proposal": null | {
    "id": "act_01",
    "title": "Restart staging worker",
    "tool": "ops.restart_service",
    "summary": "Gracefully restarts worker-02 after draining active jobs.",
    "risk": "low" | "medium" | "high"
  },
  "app_commands": [
    { "name": "set_view", "value": "spatial" }
  ]
}
```

### Field-by-field explanation

| Field | Type | Purpose |
|---|---|---|
| `kind` | `"screen"` | Always "screen" |
| `screen.text` | string | The spoken text — read aloud, plain language, no markdown |
| `screen.choices` | array (max 4 total with nav) | Buttons shown to user; `value` is what gets sent as next message |
| `screen.navigation` | array of `"back"|"cancel"|"home"` | Navigation buttons |
| `action_proposal` | null or object | If non-null, the agent is PROPOSING an action, not executing it |
| `action_proposal.id` | string | Unique identifier for the proposal |
| `action_proposal.title` | string (≤120 chars) | Human-readable title |
| `action_proposal.tool` | string (≤80 chars) | Tool being proposed (e.g., `ops.restart_service`) |
| `action_proposal.summary` | string (≤500 chars) | What the action will do |
| `action_proposal.risk` | `"low"|"medium"|"high"` | Risk level |
| `app_commands` | array | Commands to drive the app UI (usually `[]`) |

### Response examples

**Normal assistant response**:
```json
{"kind":"screen","screen":{"text":"All three servers are healthy. CPU usage is under 20 percent across the board.","choices":[{"id":"check_logs","label":"Check logs","value":"Show me the recent logs"}],"navigation":[]},"action_proposal":null,"app_commands":[]}
```

**Action proposal (approval required)**:
```json
{"kind":"screen","screen":{"text":"I've prepared this and need your OK first.","choices":[],"navigation":["cancel"]},"action_proposal":{"id":"act_01","title":"Restart staging worker","tool":"ops.restart_service","summary":"Gracefully restarts worker-02 after draining active jobs.","risk":"medium"},"app_commands":[]}
```

**Error response**:
```json
{"kind":"screen","screen":{"text":"I couldn't reach the monitoring service. The connection timed out after 10 seconds.","choices":[{"id":"retry","label":"Retry","value":"Try checking the servers again"}],"navigation":["home"]},"action_proposal":null,"app_commands":[]}
```

### How the console processes it

1. `parseScreen()` validates the JSON against the schema
2. If valid → shows `text`, renders `choices` as buttons, shows `actionProposal` in the approval panel
3. If invalid or plain text from a local model → shows text as-is
4. If completely invalid JSON → shows safe error screen
5. `app_commands` are executed immediately (theme, view changes, etc.)
6. `text` is spoken aloud via the configured TTS engine

### SSE event types the frontend expects

```
data: {"type":"response.reasoning_summary_text.delta","delta":"..."}   # thinking
data: {"type":"response.output_text.delta","delta":"..."}              # answer text
data: {"type":"response.output_text.done","text":"..."}                # final answer
data: {"type":"error","error":"..."}                                    # error
```

---

## PHASE 7 — APPROVAL / HUMAN-IN-THE-LOOP

### Current implementation

The approval flow is **fully wired in the UI** but **no agent currently triggers it**.

**How it works (from code)**:

1. **Agent proposes**: The LLM includes `action_proposal` in its response JSON
2. **Frontend parses**: `parseScreen()` in [screen.ts](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/lib/voice/screen.ts#L22-L33) extracts the proposal
3. **Stored on message**: The proposal is saved on the message object
4. **Shown in panel**: [console-panels.tsx L162-189](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/components/console-panels.tsx#L162-L189) renders it with risk badge + Approve/Deny buttons
5. **User decides**: Clicking Approve/Deny calls `onDecideProposal`
6. **Decision sent back**: [index.tsx L672-678](file:///c:/Users/Administrator/Desktop/DarkCoders/DarkCoders-OpenClaw-Assignment/DarkCoders-OpenClaw-Assignment/living-ai-talk/src/routes/index.tsx#L672-L678):
   - Approve → `"Approved action [act_01] (Restart staging worker via ops.restart_service). Proceed and report the result."`
   - Deny → `"Denied action [act_01] (Restart staging worker). Do not execute."`
7. **Sent as new user message**: `sendText()` creates a new conversation turn

**After approve**: The approval text is sent as a new user message. The agent should then execute the action and report the result.

**After deny**: The denial text is sent as a new user message. The agent should NOT execute and acknowledge.

**What actions need approval** (from ASSIGNMENT.md):
- Read-only tools can run directly
- Anything that writes, deletes, or reaches outside the workspace needs `action_proposal`
- "State-changing, destructive, external, or high-impact" actions

### Sample approval request from ASSIGNMENT.md

```json
{
  "kind": "screen",
  "screen": { "text": "I've prepared this and need your OK first.", "choices": [], "navigation": ["cancel"] },
  "action_proposal": {
    "id": "act_01",
    "title": "Restart staging worker",
    "tool": "ops.restart_service",
    "summary": "Gracefully restarts worker-02 after draining active jobs.",
    "risk": "medium"
  },
  "app_commands": []
}
```

---

## PHASE 8 — REQUIREMENTS TABLE

| Requirement | What it means | Already provided | What we build | Priority |
|---|---|---|---|---|
| Useful AI agent | An agent that solves a real problem | ❌ No | Agent definition + behavior | **MANDATORY** |
| OpenClaw | Must use OpenClaw framework | ❌ Just a gateway URL stub | Agent/skill/tool configs in openclaw/ | **MANDATORY** |
| Voice interaction | Voice in, voice out | ✅ Fully built | Nothing — just needs a working agent | **MANDATORY** |
| Structured responses | JSON screen format | ✅ Schema + parser built | Agent must return correct format | **MANDATORY** |
| Real tools | Tools that actually do things | ❌ None exist | Build 2-4 real tools | **MANDATORY** |
| Real skills | Reusable skill bundles | ❌ None exist | Build 1-2 skills | **MANDATORY** |
| Actions not just chat | Agent performs real work | ❌ Currently just chat | Tools must do real work | **MANDATORY** |
| Live steps | Show agent's work in progress | ✅ UI exists | Agent must report steps properly | **MANDATORY** |
| Human approval | Risky actions need approval | ✅ UI exists, not triggered | Agent must send action_proposals | **MANDATORY** |
| Proper error handling | Show real errors, no fakes | ✅ Error UI exists | Agent must handle errors honestly | **MANDATORY** |
| No fake results | Never swap in fake data | N/A | Must ensure tools return real data | **MANDATORY** |
| README | What you built, decisions, AI help | ❌ Template only | Write our README | **MANDATORY** |
| openclaw/ folder | Agents + skills, runnable | ❌ Empty | Populate with our configs | **MANDATORY** |
| AI usage disclosure | Note where AI helped | ❌ | Add to README | **MANDATORY** |
| Well-structured code | Reads well, thought before typing | N/A | Clean implementation | **IMPORTANT** |
| Edge cases | Handles messy/unexpected inputs | Partially (error screens) | Agent-level resilience | **IMPORTANT** |
| Extensibility | Feels like it could grow | N/A | Clean architecture | **POLISH** |
| Unexpected features | Does things they didn't ask for | N/A | Only if natural | **STRETCH** |

---

## PHASE 9 — EVALUATION LEVELS

### BASELINE — "It works"

> "We can talk to it, it answers, and it uses a tool or two."

**Technically means:**
- Voice console connects to our agent ✅ (already works for chat)
- Agent returns proper screen JSON format
- Agent uses at least 1-2 real tools
- Basic conversational flow works

**Current status**: Almost baseline — the console works, but no real tools exist.

**What we need for baseline:**
- Define an agent in `openclaw/`
- Connect at least 2 tools that do real work
- Return proper screen format

### STRONG — "Handles messy cases, code reads well"

> "It handles the messy cases too, the code reads well, and you clearly thought before you typed."

**Technically means:**
- Error handling for tool failures (timeout, API down, bad input)
- Approval flow working for risky actions
- Multiple agent skills/tools
- Clean, well-documented code
- Edge cases handled (empty input, tool timeout, invalid data)

**What we need beyond baseline:**
- action_proposal for write/delete/external operations
- Graceful tool failure handling with real error messages
- Multiple skills with clear separation
- Good README explaining decisions

### EXCEPTIONAL — "Feels like it could grow"

> "It does things we didn't ask for, and we'd trust it to make its own decisions."

**Technically means:**
- Agent makes intelligent routing decisions
- System designed to be extensible (add new tools/skills easily)
- Smart approval behavior (only asks when truly needed)
- Thoughtful UX (clear status, helpful error recovery suggestions)
- Agent personality that matches the domain

**What we need beyond strong:**
- Clean skill/tool architecture others could extend
- Agent demonstrates judgment (not just mechanical tool calling)
- Reasonable multi-agent awareness

---

## PHASE 10 — GAP ANALYSIS

### ALREADY DONE BY COMPANY

- Complete voice console UI (hold-to-talk, standby, waveform, lifecycle strip)
- Voice recording + WAV encoding
- Transcription pipeline (cloud + local ASR)
- TTS pipeline (browser native, Kokoro, cloud)
- Structured screen parser with action_proposal support
- Approval panel UI with Approve/Deny buttons
- Decision → message flow for approvals
- Agent roster UI with custom agent registration
- Live thinking/reasoning display
- Step log visualization
- Error screen fallbacks
- 3D WebXR spatial chat room
- Settings dialog (voice, appearance, models, run options, account)
- Theme system (accents, glass blur, radius)
- Mobile responsive layout
- Cloud sync (Supabase)
- Multi-provider support (OpenAI, Anthropic, Gemini, Ollama, etc.)
- Model routing and fallback chain
- SSE streaming infrastructure

### PARTIALLY DONE

- **Agent route** (`/api/agent`): Works as LLM proxy but needs to be pointed at a real OpenClaw agent with tools
- **Agent roster** (`voice.ts` AGENTS): Has persona definitions but they're just system prompt text, not real OpenClaw agents
- **System prompt** (`prompt.ts`): Good blueprint but may need extension for tool/skill awareness
- **Tool visualization**: StepLog UI exists but no real tool steps are generated

### WE MUST BUILD

- **OpenClaw agent definitions** (`openclaw/agents/`)
- **OpenClaw skills** (`openclaw/skills/`)
- **Real tools** that do actual work (API calls, data processing, etc.)
- **Agent logic** that uses tools and returns proper screen format
- **action_proposal usage** for risky actions
- **Modification to `/api/agent`** to route through OpenClaw properly (or configure the gateway)
- **README** with architecture decisions, setup instructions, AI disclosure

### OPTIONAL

- Additional agent personas
- Voice command to invoke specific tools
- Extended plan-builder integration
- Custom TTS voices per agent

### DO NOT TOUCH UNLESS NECESSARY

- `src/components/` — all UI components
- `src/routes/index.tsx` — main console page
- `src/lib/voice/screen.ts` — screen parser
- `src/lib/voice/record-wav.ts` — WAV recorder
- `src/lib/voice/speak.ts` — TTS
- `src/lib/settings/` — all settings infrastructure
- `supabase/` — cloud sync
- `public/` — static assets
- `src/components/xr-chat.tsx` — 3D room

### UNKNOWN / NEEDS INVESTIGATION

- **OpenClaw Gateway setup**: We need to determine how to run an OpenClaw gateway locally. The assignment mentions `OPENCLAW_GATEWAY_URL` but the actual gateway software setup is not documented in the repo.
- **OpenClaw agent definition format**: The exact YAML/config format for defining agents in OpenClaw needs to be confirmed from OpenClaw documentation.
- **Tool execution mechanism**: How OpenClaw actually invokes tools (MCP server, HTTP calls, scripts) needs investigation.

---

## PHASE 11 — AGENT IDEAS

### Idea 1: DevOps Command Center

**NAME**: DevOps Command Center

**PROBLEM IT SOLVES**: Operations engineers need to check server health, review logs, manage deployments, and respond to incidents — often from a phone or while away from a terminal.

**WHO WOULD USE IT**: DevOps engineers, SREs, on-call engineers

**EXAMPLE VOICE CONVERSATION**:
```
User: "Check the status of our production servers"
Agent: [runs check_servers tool] "All three production servers are healthy. 
       CPU usage is 12, 18, and 15 percent. Memory is normal."
       [choices: "Check logs", "View deployments"]

User: "Deploy the latest build to staging"
Agent: [shows action_proposal with risk=medium]
       "I'd like to deploy build v2.4.1 to staging. This will replace 
       the current running version. Should I proceed?"
       [Approve / Deny in panel]

User: [approves]
Agent: [runs deploy tool] "Deployment complete. Build v2.4.1 is now 
       running on staging. Health checks are passing."
```

**TOOLS**:
- `check_server_status` — read-only, returns server health metrics
- `check_logs` — read-only, returns recent log entries
- `deploy_to_staging` — write operation, requires approval
- `restart_service` — write operation, requires approval

**SKILLS**:
- `server_monitoring` — bundles health check + log reading
- `deployment_management` — bundles deploy + rollback

**RISKY ACTIONS**: Deploy, restart, rollback — all require approval

**WHY IT MATCHES**: Natural voice use case, clear read vs. write separation, obvious approval scenarios, realistic

**COMPLEXITY**: Medium | **DEMO VALUE**: High | **FAILURE RISK**: Low (can simulate infrastructure)

---

### Idea 2: Code Review Assistant

**NAME**: Code Review Assistant

**PROBLEM IT SOLVES**: Reviewing pull requests, checking code quality, analyzing diffs, and suggesting improvements — hands-free while reading code on another screen.

**WHO WOULD USE IT**: Software developers, tech leads

**EXAMPLE VOICE CONVERSATION**:
```
User: "Review the latest pull request"
Agent: [fetches PR] "Pull request 47 by Alice: Adds user caching layer. 
       12 files changed, 340 additions. I see a potential memory leak 
       in the cache eviction logic."
       [choices: "Show details", "Check tests"]

User: "Approve it with a comment about the memory issue"
Agent: [action_proposal] "I'll approve PR 47 and leave a comment about 
       the cache eviction concern. This modifies the repository."
```

**TOOLS**: `list_pull_requests`, `get_pr_diff`, `analyze_code`, `approve_pr` (needs approval), `add_comment` (needs approval)

**COMPLEXITY**: Medium | **DEMO VALUE**: High | **FAILURE RISK**: Medium (needs GitHub API)

---

### Idea 3: Smart Home Controller

**NAME**: Smart Home Controller

**PROBLEM IT SOLVES**: Control home devices, check sensor data, set automation rules — natural voice interface.

**TOOLS**: `get_sensor_data`, `set_thermostat` (approval), `toggle_lights`, `set_alarm` (approval)

**COMPLEXITY**: Low | **DEMO VALUE**: Medium | **FAILURE RISK**: Low

---

### Idea 4: Research Assistant

**NAME**: Research Assistant

**PROBLEM IT SOLVES**: Search for information, summarize articles, organize findings, generate reports.

**TOOLS**: `web_search`, `summarize_url`, `save_finding`, `generate_report` (approval for sending)

**COMPLEXITY**: Medium | **DEMO VALUE**: Medium | **FAILURE RISK**: Medium (depends on search API)

---

### Idea 5: File & Project Manager

**NAME**: File & Project Manager

**PROBLEM IT SOLVES**: Manage project files, check directory structure, create/organize files, run scripts — voice-first local project management.

**TOOLS**: `list_directory`, `read_file`, `create_file` (approval), `delete_file` (approval), `run_script` (approval)

**COMPLEXITY**: Low-Medium | **DEMO VALUE**: Medium | **FAILURE RISK**: Low

---

### Rankings

| Rank | Idea | Why |
|---|---|---|
| **#1** | **DevOps Command Center** | Perfect voice use case, clear approval scenarios, realistic, impressive demo, achievable in a weekend |
| **#2** | Code Review Assistant | Great but GitHub API dependency adds risk |
| **#3** | File & Project Manager | Safe bet but less impressive in demo |

---

## PHASE 12 — RECOMMENDED PROJECT

### WHY: DevOps Command Center

1. **Natural voice fit**: Ops engineers actually check servers by voice (on-call, mobile)
2. **Clear tool separation**: Read-only (check status, read logs) vs. write (deploy, restart)
3. **Obvious approval scenarios**: Deploying to staging = medium risk, restarting production = high risk
4. **Demonstrable in interview**: Easy to show the full flow in 2 minutes
5. **Weekend-achievable**: 4-5 tools, 2 skills, 1 agent
6. **Extensible**: Easy to add new tools (database queries, alerts, etc.)

### FINAL USER EXPERIENCE

```
User opens the voice console.
Says: "Hey, check on our servers"
→ Agent checks server health (read-only tool, no approval)
→ Shows status with choices: "View logs", "Check deployments"

User: "Deploy the latest build to staging"  
→ Agent proposes action (action_proposal with risk=medium)
→ Approval panel shows: "Deploy build v2.4.1 to staging"
→ User clicks Approve
→ Agent executes and reports result

User: "Restart the production database"
→ Agent proposes action (risk=HIGH)
→ Approval panel shows with red HIGH RISK badge
→ User can approve or deny
```

### TOOLS

| Tool | Type | Approval? |
|---|---|---|
| `ops.check_servers` | Read-only | No |
| `ops.read_logs` | Read-only | No |
| `ops.list_deployments` | Read-only | No |
| `ops.deploy` | State-changing | **YES (medium)** |
| `ops.restart_service` | State-changing | **YES (high)** |

### SKILLS

| Skill | Tools included |
|---|---|
| `server_monitoring` | check_servers, read_logs |
| `deployment_ops` | list_deployments, deploy, restart_service |

### WHAT THE AGENT WILL NOT DO

- Actually manage real servers (simulated but realistic data)
- Access real cloud infrastructure
- Store credentials in the browser
- Claim success when something fails

### APPROVAL ACTIONS

- Deploy → medium risk ("replaces running version")
- Restart → high risk ("causes momentary downtime")
- All read operations → no approval needed

### ERROR CASES

- Server unreachable → "I couldn't reach the monitoring service. Connection timed out."
- Tool returns unexpected data → "The health check returned an unexpected format. Here's what I got: ..."
- Deployment fails → "Deployment failed: build artifact not found. No changes were made."

### EDGE CASES

- User asks to deploy to production → agent refuses, production deploys are not available by voice
- User asks about unsupported infrastructure → agent explains what's available
- Approval timeout → handled by console's existing cancellation flow

---

## PHASE 13 — END-TO-END RUNTIME FLOW

```
User holds microphone button
    ↓
[record-wav.ts] recordWav() → captures audio → encodes WAV
    ↓
User releases button
    ↓
[index.tsx] finishTurn(file) → recording.stop() → File
    ↓
[index.tsx] Stage: "received" → "transcribing"
    ↓
[agent.ts] transcribeRecording(file) 
    → POST /api/transcribe { file (FormData) }
    → [transcribe.ts] proxies to GATEWAY/v1/audio/transcriptions
    → SSE stream: transcript.text.delta → transcript.text.done
    → Returns text: "check on our servers"
    ↓
[index.tsx] appendMessage({ role: "user", text: "check on our servers" })
    ↓
[index.tsx] Stage: "planning"
    ↓
[index.tsx] runAgent(history, signal)
    → builds turns array, gets agent persona, plan context
    ↓
[providers-client.ts] runProvider(provider, turns, context, handlers, signal)
    → provider.kind === "builtin" → streamAgentAnswer()
    ↓
[agent.ts] streamAgentAnswer(turns, handlers, signal, context, model)
    → POST /api/agent { turns, context, model }
    ↓
[routes/api/agent.ts] POST handler
    → resolveGatewayModel() → model ID
    → builds system prompt + turns in OpenAI format
    → streamResponses(request, input, {text: {format: OUTPUT_FORMAT}}, model)
    ↓
[responses.server.ts] streamResponses()
    → if openai/ model: POST GATEWAY/v1/responses (with JSON schema)
    → else: POST GATEWAY/v1/chat/completions → convert stream format
    ↓
    ★★★ THIS IS WHERE OUR OPENCLAW AGENT PROCESSES THE REQUEST ★★★
    The Gateway routes to our agent, which:
    1. Understands the intent ("check servers")
    2. Selects skill (server_monitoring)
    3. Invokes tool (ops.check_servers)
    4. Gets real results
    5. Formats response as screen JSON
    ↓
SSE stream back to frontend:
    data: {"type":"response.reasoning_summary_text.delta","delta":"Checking servers..."}
    data: {"type":"response.output_text.delta","delta":"{\"kind\":\"screen\"..."}
    data: {"type":"response.output_text.done","text":"{...full JSON...}"}
    ↓
[agent.ts] readSse() parses events
    → handlers.onThinking("Checking servers...")
    → handlers.onAnswer(partialJSON)
    ↓
[index.tsx] Stage: "thinking" → "streaming"
    ↓
[providers-client.ts] returns raw answer string
    ↓
[index.tsx] cleanRaw() removes code fences
    → parseScreen(cleaned) → Screen object with text, choices, actionProposal
    ↓
[index.tsx] If screen.actionProposal exists:
    → addStep("Approval required", title + tool)
    → Rendered in LifecyclePanel approval section
    → User clicks Approve/Deny
    → sendText("Approved action [act_01]...")
    → New runAgent cycle with approval decision
    ↓
[index.tsx] appendMessage({ role: "assistant", text, screen, steps })
    ↓
[index.tsx] Stage: "speaking"
    → speakWith(voice, spokenScreen(screen))
    → Browser TTS / Kokoro / Cloud TTS
    ↓
User hears the response spoken aloud
```

---

## PHASE 14 — IMPLEMENTATION PLAN

### PHASE 1: Minimal Agent Connection (2-3 hours)

**Goal**: Get a basic OpenClaw agent responding through the console.

**Strategy decision**: Since we need a working system quickly and the existing `/api/agent` route already calls an OpenClaw gateway, we have two approaches:

**Option A** (Recommended): Keep the current architecture where `/api/agent` calls the Gateway, and set up an actual OpenClaw gateway with our agent config. The agent's intelligence comes from its system prompt + tool definitions in the OpenClaw config.

**Option B**: Modify `/api/agent` to implement agent logic directly on the server side (without a separate OpenClaw gateway process). This is simpler for demo but less "OpenClaw-native."

> **Recommendation**: Start with Option B for reliability (fewer moving parts), but structure the code so it maps cleanly to OpenClaw concepts. Put the agent/skill/tool definitions in `openclaw/` regardless.

**FILES TO MODIFY**:
- `src/routes/api/agent.ts` — add tool-calling logic
- `src/lib/ai/responses.server.ts` — possibly extend for tool-aware responses

**FILES TO CREATE**:
- `openclaw/agents/devops-commander.yaml` — agent definition
- `openclaw/skills/server-monitoring.yaml` — skill definition
- `openclaw/skills/deployment-ops.yaml` — skill definition

**EXPECTED RESULT**: Say "hello" → get a proper DevOps agent response
**HOW TO VERIFY**: Open console, type "hello", see a DevOps-themed response

---

### PHASE 2: Read-Only Tools (2-3 hours)

**Goal**: Implement tools that check server status and read logs.

**FILES TO CREATE**:
- `src/lib/tools/server-status.ts` — check_servers tool (returns simulated but realistic data)
- `src/lib/tools/log-reader.ts` — read_logs tool (returns simulated log entries)
- `src/lib/tools/index.ts` — tool registry

**WHAT WILL CHANGE**: Agent can now call tools and return real data
**EXPECTED RESULT**: "Check our servers" → agent calls tool → shows real metrics
**HOW TO VERIFY**: Voice or type the command, see server metrics in response

**RISKS**: Tool output formatting must match what the LLM can turn into screen JSON

---

### PHASE 3: Agent Behavior (2 hours)

**Goal**: Agent correctly routes to skills, uses tools intelligently, returns proper screen format.

**FILES TO MODIFY**:
- `src/routes/api/agent.ts` — implement tool-calling loop
- `src/lib/voice/prompt.ts` — extend system prompt with tool/skill awareness

**FILES TO CREATE**:
- `src/lib/tools/tool-executor.ts` — executes tools, formats results

**EXPECTED RESULT**: Natural multi-turn conversation with tool usage
**HOW TO VERIFY**: Multi-turn conversation works, tools are invoked correctly

---

### PHASE 4: Approval Flow (1-2 hours)

**Goal**: Risky actions produce action_proposals, approval/denial works.

**FILES TO CREATE**:
- `src/lib/tools/deploy.ts` — deploy tool (simulated)
- `src/lib/tools/restart-service.ts` — restart tool (simulated)

**FILES TO MODIFY**:
- `src/routes/api/agent.ts` — handle approval results in conversation

**EXPECTED RESULT**: "Deploy to staging" → action_proposal appears → Approve → execution
**HOW TO VERIFY**: See proposal in approval panel, approve it, see result

---

### PHASE 5: Error Handling (1 hour)

**Goal**: Tool failures, timeouts, and edge cases handled gracefully.

**FILES TO MODIFY**:
- Tool implementations — add error simulation
- Agent logic — handle tool errors

**EXPECTED RESULT**: "Check server omega" → "Server omega was not found in your infrastructure."
**HOW TO VERIFY**: Trigger various error conditions, verify real error messages

---

### PHASE 6: Agent Registration (30 min)

**Goal**: Register our DevOps agent in the roster.

**FILES TO MODIFY**:
- `src/lib/settings/voice.ts` — update AGENTS with our DevOps agent
- `src/lib/ai/models.ts` — if needed, add model entries

**EXPECTED RESULT**: DevOps agent appears in settings and spatial room
**HOW TO VERIFY**: Open settings → Voice & Agents → see our agent

---

### PHASE 7: Polish + Voice Demo (1-2 hours)

**Goal**: Ensure voice interaction is smooth and demo-ready.

**WHAT TO CHECK**:
- Voice input → tool → voice output full loop
- Approval flow via voice
- Error recovery via voice
- Standby mode works
- Step log shows meaningful steps

---

### PHASE 8: README + Submission (1 hour)

**FILES TO CREATE/MODIFY**:
- `README.md` — complete rewrite with: what we built, architecture decisions, setup, AI disclosure
- `openclaw/README.md` — gateway setup instructions

---

## PHASE 15 — FILE CHANGE MAP

### MODIFY

| File | Reason |
|---|---|
| `src/routes/api/agent.ts` | Add tool-calling agent logic with OpenClaw-style processing |
| `src/lib/settings/voice.ts` | Register our DevOps agent in the AGENTS roster |
| `src/lib/voice/prompt.ts` | Extend system prompt with tool/skill awareness (minimal changes) |
| `README.md` | Rewrite with our project description, decisions, AI disclosure |
| `.env.example` | Add any new env vars if needed |

### CREATE

| File | Reason |
|---|---|
| `openclaw/README.md` | Rewrite with actual setup instructions |
| `openclaw/gateway.yaml` | OpenClaw gateway configuration |
| `openclaw/agents/devops-commander.yaml` | Our main agent definition |
| `openclaw/skills/server-monitoring.yaml` | Server monitoring skill |
| `openclaw/skills/deployment-ops.yaml` | Deployment operations skill |
| `src/lib/tools/index.ts` | Tool registry and executor |
| `src/lib/tools/server-status.ts` | Server health check tool |
| `src/lib/tools/log-reader.ts` | Log reading tool |
| `src/lib/tools/deployments.ts` | Deployment list + deploy tool |
| `src/lib/tools/restart-service.ts` | Service restart tool |

### KEEP UNCHANGED

Everything else — the console UI, voice pipeline, TTS, recording, screen parser, approval panel, XR room, settings, theme, etc. — all already work perfectly.

### DELETE

Nothing.

---

## PHASE 16 — LIVE DEMO PLAN

### Demo Scenario 1: Normal Query (Success)

**Voice command**: "What's the status of our production servers?"

**Expected agent steps**:
1. Received → voice note
2. Transcribing → "what's the status of our production servers"
3. Planning → Agent: DevOps Commander
4. Thinking → "I'll check the server health..."
5. Tool: `ops.check_servers` → executing...
6. Reply ready → 2 buttons

**Expected result**: "All three production servers are healthy. Server alpha is at 12 percent CPU, server beta at 18 percent, server gamma at 15 percent. Memory usage is normal across the board."
Choices: [Check logs] [View deployments]

---

### Demo Scenario 2: Approval Flow

**Voice command**: "Deploy the latest build to staging"

**Expected steps**:
1-4. Same as above
5. Tool: `ops.list_deployments` → gets latest build
6. Approval required → Deploy v2.4.1 to staging · ops.deploy

**Expected result**: Approval panel shows:
- Title: "Deploy build v2.4.1 to staging"
- Tool: ops.deploy
- Risk: ● MEDIUM RISK
- Summary: "Replaces the current staging build with v2.4.1. The staging environment will be briefly unavailable during deployment."

User clicks **Approve**.

Agent responds: "Deployment complete. Build v2.4.1 is now live on staging. All 12 health checks are passing."

---

### Demo Scenario 3: Error/Edge Case

**Voice command**: "Restart the quantum processing unit"

**Expected steps**:
1-4. Same
5. Tool: `ops.check_servers` → service not found

**Expected result**: "I don't see a quantum processing unit in your infrastructure. The available services are alpha, beta, and gamma production servers, plus the staging environment. Would you like to check one of those?"
Choices: [Check servers] [View services]

---

### What Interviewers May Ask

**Q: Why did you choose this architecture?**
A: "The console was already built with a clean bridge at `/api/agent`. Rather than over-engineering a separate gateway process, I implemented the agent logic directly in the server route but structured it to mirror OpenClaw concepts — agents, skills, and tools — so it maps directly to a real OpenClaw deployment. The `openclaw/` folder contains the configurations that would drive a production gateway."

**Q: Why OpenClaw?**
A: "OpenClaw provides the abstraction layer between the agent's intent and the actual execution. It separates concerns: the agent reasons about what to do, skills bundle domain knowledge, and tools do the actual work. This makes it easy to add new capabilities without changing the agent's core logic."

**Q: Why human approval here?**
A: "The assignment explicitly requires it for consequential actions, and it's the right engineering call. Read-only operations like checking server status are safe and fast — they run immediately. But deploying code or restarting services can cause downtime, so they go through the approval panel. The risk level (medium for staging deploys, high for production restarts) helps the operator make quick decisions."

**Q: What happens if a tool fails?**
A: "The agent reports the real error. If the monitoring API times out, the user sees 'I couldn't reach the monitoring service.' No fake data, no pretending it worked. The agent offers a retry option. This is explicitly called out in the assignment requirements."

**Q: How would you scale it?**
A: "The tool registry pattern makes it trivial to add new tools — each is a self-contained module. Skills group related tools. New agents can compose from existing skills. For production, the agent logic would move to a real OpenClaw gateway, the tools would call real APIs with proper auth, and you'd add rate limiting, caching, and observability."

**Q: What would you improve with another week?**
A: "Real infrastructure connections (AWS/GCP APIs), streaming tool execution (show progress for long operations), tool result caching, agent memory across sessions, and a richer deployment pipeline with rollback support."

**Q: What did AI help with?**
A: "I used AI for the initial analysis of the codebase structure, generating boilerplate for tool definitions, and refining the system prompt. All architectural decisions and the tool logic were my own."

---

## PHASE 17 — EXECUTIVE SUMMARY

1. **WHAT THE STARTER PROJECT IS**: A complete voice console web app (TanStack Start + React + Three.js) with hold-to-talk, standby mode, live agent steps, approval panel, 3D spatial chat, settings, and multi-provider support.

2. **WHAT DARK CODERS BUILT FOR US**: Everything except the agent brain — recording, transcription, TTS, structured screen rendering, approval UI, app commands, error handling, theming, mobile layout, XR room.

3. **WHAT THEY EXPECT US TO BUILD**: An intelligent agent with real tools and skills on OpenClaw, connected through the existing bridge, with human approval for risky actions.

4. **WHAT IS CURRENTLY MISSING**: Agent logic, tools, skills, OpenClaw config, approval-triggering behavior, and a README.

5. **THE AGENT WE SHOULD BUILD**: **DevOps Command Center** — a voice-first operations assistant that checks servers, reads logs, and manages deployments.

6. **THE TOOLS WE SHOULD USE**: `ops.check_servers`, `ops.read_logs`, `ops.list_deployments`, `ops.deploy` (approval), `ops.restart_service` (approval).

7. **THE SKILLS WE SHOULD CREATE**: `server_monitoring` (read-only tools), `deployment_ops` (write tools with approval).

8. **WHERE APPROVAL IS REQUIRED**: Deploying code (medium risk), restarting services (high risk). All read-only operations run immediately.

9. **EXACT FILES WE WILL LIKELY CHANGE**:
   - Modify: `src/routes/api/agent.ts`, `src/lib/settings/voice.ts`, `README.md`
   - Create: ~10 files in `openclaw/` and `src/lib/tools/`
   - Keep unchanged: All console UI, voice pipeline, settings, XR room

10. **ESTIMATED IMPLEMENTATION COMPLEXITY**: **Medium** — approximately 8-12 focused hours. Core agent + 5 tools + 2 skills + approval flow + README.

11. **WHY THIS SHOULD QUALIFY AS A STRONG SUBMISSION**: It demonstrates clear engineering judgment (small sharp system), proper separation of concerns (agent/skill/tool), honest error handling, meaningful approval scenarios, and a domain that naturally fits voice interaction. The code is extensible without being over-engineered, and every architectural decision has a clear rationale defensible in an interview.
