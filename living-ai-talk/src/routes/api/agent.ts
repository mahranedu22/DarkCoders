import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPT, planContextMessage } from "@/lib/voice/prompt";
import { resolveGatewayModel } from "@/lib/ai/models";
import { AGENTS } from "@/lib/settings/voice";

type Turn = { role: "user" | "assistant"; text: string };

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let turns: Turn[] = [];
        let context: string | undefined;
        let agentName: string | undefined;
        let rawModel: string | undefined;

        try {
          const body = (await request.json()) as {
            turns?: Turn[];
            context?: unknown;
            model?: unknown;
            agent?: unknown;
          };
          if (Array.isArray(body.turns)) {
            turns = body.turns.filter((t) => t && typeof t.text === "string");
          }
          if (typeof body.context === "string") context = body.context;
          if (typeof body.agent === "string" && body.agent) agentName = body.agent;
          if (typeof body.model === "string" && body.model) rawModel = body.model;
        } catch {
          turns = [];
        }

        if (!turns.length) {
          return new Response(JSON.stringify({ error: "Nothing to answer" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 1. Model Validation per AGENTS.md and models.test.ts:
        // "Built-in replies accept only allowlisted model names (src/lib/ai/models.ts);
        // unknown picks error instead of being swapped, so a chosen task model is never silently replaced."
        const resolvedModel = resolveGatewayModel(rawModel);
        if (!resolvedModel) {
          return new Response(
            JSON.stringify({
              error: `Model "${rawModel}" is not offered or allowlisted for built-in execution.`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // 2. Agent Resolution: extract from body.agent or parse from context role header
        if (!agentName && context) {
          const match = context.match(/Agent role \((\w+)\)/);
          if (match?.[1]) agentName = match[1];
        }
        if (!agentName) agentName = "general";

        // 3. Route all agents through our tool-calling engine
        return handleAgentExecution(request, turns, agentName, context);
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Unified Agent Engine — Gemini tool-calling with REAL tool execution & HITL
// ---------------------------------------------------------------------------

async function handleAgentExecution(
  request: Request,
  turns: Turn[],
  agentName: string,
  context?: string,
) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not set in .env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { toolsForGemini, resolveToolName, requiresApproval, TOOLS } = await import(
    "@/lib/tools/index.ts"
  );
  const { executeTool } = await import("@/lib/tools/executor.ts");

  const plan = planContextMessage(context);
  const profile = AGENTS[agentName] ?? AGENTS["general"]!;

  // Dynamic system prompt tailored to the active agent persona
  const agentPrompt = [
    SYSTEM_PROMPT,
    "",
    `ACTIVE AGENT ROLE (${agentName}): ${profile.persona}`,
    "",
    "TOOL USAGE AND SAFETY CHARTER:",
    "- You have access to real infrastructure tools (ops.system_diagnostics, ops.list_services, ops.inspect_logs, ops.deploy, ops.restart_service).",
    "- Read-only tools (ops.system_diagnostics, ops.inspect_logs, ops.list_services) run directly and report real ground-truth data.",
    "- State-changing operations (ops.deploy, ops.restart_service) are DANGEROUS. You MUST NEVER execute them on first request. You must emit an action_proposal screen with clear title, summary, and risk tier for the human operator to Approve or Deny via the console UI.",
    "- When a user message begins with 'APPROVED:' followed by an action, then and only then may you invoke that mutating tool.",
    "- When a user message begins with 'DENIED:', acknowledge the cancellation and suggest alternative investigation paths.",
    "- Production deploys are strictly prohibited via conversational voice commands — refuse them outright.",
    "- Zero fake results: if an operation fails, report the exact error message. Never fabricate telemetry or imaginary statuses.",
    "- Keep screen.text natural, concise, and conversational for text-to-speech reading aloud (no raw tables or long logs in spoken text).",
    "",
    "APP CONTROLS: set_agent enum includes: general, ciso, planner, coder, devops.",
    ...(plan ? ["", `PLANNING CONTEXT:\n${plan}`] : []),
  ].join("\n");

  const contents = turns.slice(-12).map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));

  const tools = [{ function_declarations: toolsForGemini() }];

  const screenSchema = {
    type: "OBJECT" as const,
    properties: {
      kind: { type: "STRING" as const, enum: ["screen"] },
      screen: {
        type: "OBJECT" as const,
        properties: {
          text: { type: "STRING" as const },
          choices: {
            type: "ARRAY" as const,
            items: {
              type: "OBJECT" as const,
              properties: {
                id: { type: "STRING" as const },
                label: { type: "STRING" as const },
                value: { type: "STRING" as const },
              },
              required: ["id", "label", "value"],
            },
          },
          navigation: {
            type: "ARRAY" as const,
            items: { type: "STRING" as const, enum: ["back", "cancel", "home"] },
          },
        },
        required: ["text", "choices", "navigation"],
      },
      action_proposal: {
        type: "OBJECT" as const,
        nullable: true,
        properties: {
          id: { type: "STRING" as const },
          title: { type: "STRING" as const },
          tool: { type: "STRING" as const },
          summary: { type: "STRING" as const },
          risk: { type: "STRING" as const, enum: ["low", "medium", "high"] },
        },
        required: ["id", "title", "tool", "summary"],
      },
      app_commands: {
        type: "ARRAY" as const,
        items: {
          type: "OBJECT" as const,
          properties: {
            name: {
              type: "STRING" as const,
              enum: [
                "set_view",
                "show_tab",
                "set_agent",
                "set_speaking_rate",
                "open_settings",
                "close_settings",
                "standby",
                "set_accent",
                "set_style",
                "open_headset",
              ],
            },
            value: { type: "STRING" as const },
          },
          required: ["name", "value"],
        },
      },
    },
    required: ["kind", "screen", "action_proposal", "app_commands"],
  };

  let currentContents = [...contents];
  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS - 1;

    const geminiBody: Record<string, unknown> = {
      contents: currentContents,
      systemInstruction: { parts: [{ text: agentPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(isLastRound
          ? { responseMimeType: "application/json", responseSchema: screenSchema }
          : {}),
      },
      ...(!isLastRound ? { tools } : {}),
    };

    const candidateModels = [
      process.env["GEMINI_MODEL"],
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
    ].filter((m): m is string => Boolean(m) && m !== "gemini-2.5-flash");

    let geminiResponse: Response | undefined;
    for (const modelCandidate of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${apiKey}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
            signal: request.signal,
          });
          if (geminiResponse.ok) break;
          if (geminiResponse.status !== 503 && geminiResponse.status !== 429) break;
          await new Promise((r) => setTimeout(r, 600));
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      if (geminiResponse?.ok) break;
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const detail = geminiResponse ? (await geminiResponse.text()).slice(0, 500) : "No response";
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiResponse?.status ?? 502}: ${detail}` }),
        { status: geminiResponse?.status ?? 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const geminiData = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            thought?: boolean;
            functionCall?: { name: string; args: Record<string, unknown> };
          }>;
        };
      }>;
    };

    const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // Final text response: filter out reasoning thought tokens
      const answerParts = parts.filter((p) => p.text && !(p as { thought?: boolean }).thought);
      let responseText =
        (answerParts.length > 0
          ? answerParts.map((p) => p.text).join("")
          : parts.find((p) => p.text)?.text) ?? "";

      const cleanJson = responseText
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

      try {
        const parsed = JSON.parse(cleanJson) as Record<string, unknown>;
        if (typeof parsed === "object" && parsed !== null) {
          if (!parsed["kind"]) parsed["kind"] = parsed["action_proposal"] ? "action_proposal" : "screen";
          if (!parsed["screen"] && typeof parsed["text"] === "string") {
            parsed["screen"] = { text: parsed["text"], choices: [], navigation: [] };
          }
          if (parsed["action_proposal"] === undefined) parsed["action_proposal"] = null;
          if (!Array.isArray(parsed["app_commands"])) parsed["app_commands"] = [];
          responseText = JSON.stringify(parsed);
        } else {
          throw new Error("Not object");
        }
      } catch {
        responseText = JSON.stringify({
          kind: "screen",
          screen: { text: responseText, choices: [], navigation: [] },
          action_proposal: null,
          app_commands: [],
        });
      }

      return streamAsSSE(responseText);
    }

    // Process function calls
    const fc = functionCalls[0]!.functionCall!;
    const toolName = resolveToolName(fc.name);
    const toolDef = TOOLS[toolName];

    // If tool requires approval, return an action_proposal screen instead of executing
    if (requiresApproval(toolName)) {
      const lastUserMsg = turns[turns.length - 1]?.text ?? "";
      const isApproved = lastUserMsg.toUpperCase().startsWith("APPROVED:");

      if (!isApproved) {
        const proposalResponse = JSON.stringify({
          kind: "screen",
          screen: {
            text: `I need your approval to ${toolDef?.description ?? toolName}. Please review the details in the approval panel.`,
            choices: [],
            navigation: ["cancel"],
          },
          action_proposal: {
            id: `act_${Date.now()}`,
            title: formatToolTitle(toolName, fc.args),
            tool: toolName,
            summary: formatToolSummary(toolName, fc.args),
            risk: toolDef?.risk ?? "medium",
          },
          app_commands: [],
        });
        return streamAsSSE(proposalResponse);
      }
    }

    // Execute the tool for real
    const result = await executeTool(toolName, fc.args);

    currentContents = [
      ...currentContents,
      {
        role: "model",
        parts: geminiData.candidates?.[0]?.content?.parts ?? [{ functionCall: { name: fc.name, args: fc.args } }],
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: fc.name,
              response: result,
            },
          },
        ],
      },
    ] as typeof currentContents;
  }

  return new Response(
    JSON.stringify({ error: "Agent exceeded maximum tool-calling rounds" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

function streamAsSSE(fullText: string): Response {
  const encoder = new TextEncoder();
  const chunkSize = 80;

  const stream = new ReadableStream({
    start(controller) {
      let offset = 0;
      const send = () => {
        if (offset < fullText.length) {
          const chunk = fullText.slice(offset, offset + chunkSize);
          offset += chunkSize;
          const event = `data: ${JSON.stringify({ type: "response.output_text.delta", delta: chunk })}\n\n`;
          controller.enqueue(encoder.encode(event));
          setTimeout(send, 15);
        } else {
          const doneEvent = `data: ${JSON.stringify({ type: "response.output_text.done", text: fullText })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          controller.close();
        }
      };
      send();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function formatToolTitle(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "ops.deploy":
      return `Deploy v${args["version"]} to ${args["service"]}`;
    case "ops.restart_service":
      return `Restart ${args["service"]}`;
    default:
      return toolName;
  }
}

function formatToolSummary(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "ops.deploy":
      return `Deploy build version ${args["version"]} to the ${args["service"]} service. This will update the service version and mark the build as deployed.`;
    case "ops.restart_service":
      return `Restart the ${args["service"]} service${args["reason"] ? ` — reason: ${args["reason"]}` : ""}. This will reset the service status and log the restart.`;
    default:
      return `Execute ${toolName}`;
  }
}
