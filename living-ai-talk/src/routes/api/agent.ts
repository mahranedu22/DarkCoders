import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPT, planContextMessage } from "@/lib/voice/prompt";

type Turn = { role: "user" | "assistant"; text: string };

/**
 * DevOps agent system prompt — extends the base console prompt with
 * tool-aware instructions and the devops persona.
 */
const DEVOPS_SYSTEM = [
  SYSTEM_PROMPT,
  "",
  "ROLE: You are a DevOps and Incident Response specialist. You manage staging services, monitor system health, inspect logs, and handle deployments and restarts. You have access to real tools that read actual system state and modify real files.",
  "",
  "TOOL USAGE RULES:",
  "- Read-only tools (ops.system_diagnostics, ops.inspect_logs, ops.list_services) run directly and return real data.",
  "- State-changing tools (ops.deploy, ops.restart_service) are DESTRUCTIVE. When the user asks to deploy or restart, you MUST propose the action via action_proposal in your JSON response so the human can approve or deny it. Do NOT call these tools directly on first request.",
  "- When a user message says 'APPROVED:' followed by a tool description, THEN you may call the approved tool.",
  "- When a user message says 'DENIED:' followed by a tool description, acknowledge the denial and suggest alternatives.",
  "- Production deploys are never allowed via voice — refuse them outright.",
  "",
  "TOOL RESULTS: When you receive tool results, incorporate the real data into your spoken response. Never fabricate or embellish the data. If a tool fails, report the real error message.",
  "",
  "APP CONTROLS: set_agent enum includes: general, ciso, planner, coder, devops.",
].join("\n");

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let turns: Turn[] = [];
        let context: string | undefined;
        let agentName: string | undefined;
        try {
          const body = (await request.json()) as { turns?: Turn[]; context?: unknown; model?: unknown; agent?: unknown };
          if (Array.isArray(body.turns)) turns = body.turns.filter((t) => t && typeof t.text === "string");
          if (typeof body.context === "string") context = body.context;
          if (typeof body.agent === "string") agentName = body.agent;
        } catch {
          turns = [];
        }
        if (!turns.length) {
          return new Response(JSON.stringify({ error: "Nothing to answer" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // If agent is "devops", use the Gemini tool-calling flow
        // Otherwise fall back to the original OpenClaw gateway flow
        if (agentName === "devops") {
          return handleDevopsAgent(request, turns, context);
        }

        // --- Original gateway path (unchanged) ---
        const { streamResponses } = await import("@/lib/ai/responses.server");
        const { resolveGatewayModel } = await import("@/lib/ai/models");
        const { OUTPUT_FORMAT } = await import("@/lib/voice/prompt");
        const model = resolveGatewayModel(undefined);
        const plan = planContextMessage(context);
        const input: Record<string, unknown>[] = [
          { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
          ...(plan ? [{ role: "system", content: [{ type: "input_text", text: plan }] }] : []),
          ...turns.slice(-12).map((turn) => ({
            role: turn.role,
            content: [
              turn.role === "assistant"
                ? { type: "output_text", text: turn.text }
                : { type: "input_text", text: turn.text },
            ],
          })),
        ];
        return streamResponses(request, input, { text: { format: OUTPUT_FORMAT } }, model!);
      },
    },
  },
});

// ---------------------------------------------------------------------------
// DevOps Agent — Gemini tool-calling with REAL tool execution
// ---------------------------------------------------------------------------

async function handleDevopsAgent(request: Request, turns: Turn[], context?: string) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not set in .env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { toolsForGemini, resolveToolName, requiresApproval, TOOLS } = await import("@/lib/tools/index");
  const { executeTool } = await import("@/lib/tools/executor");

  const plan = planContextMessage(context);

  // Build Gemini messages
  const systemInstruction = DEVOPS_SYSTEM + (plan ? `\n\nPlanning context:\n${plan}` : "");
  const contents = turns.slice(-12).map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));

  // Gemini tool definitions
  const tools = [{ function_declarations: toolsForGemini() }];

  // JSON output schema for screen responses
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
          navigation: { type: "ARRAY" as const, items: { type: "STRING" as const, enum: ["back", "cancel", "home"] } },
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
            name: { type: "STRING" as const, enum: ["set_view", "show_tab", "set_agent", "set_speaking_rate", "open_settings", "close_settings", "standby", "set_accent", "set_style", "open_headset"] },
            value: { type: "STRING" as const },
          },
          required: ["name", "value"],
        },
      },
    },
    required: ["kind", "screen", "action_proposal", "app_commands"],
  };

  // Tool-calling loop (max 5 iterations to prevent infinite loops)
  let currentContents = [...contents];
  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS - 1;

    const geminiBody: Record<string, unknown> = {
      contents: currentContents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(isLastRound ? { responseMimeType: "application/json", responseSchema: screenSchema } : {}),
      },
      ...(!isLastRound ? { tools } : {}),
    };

    const modelName = process.env["GEMINI_MODEL"] || "gemini-3.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
        signal: request.signal,
      });
    } catch (err) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      return new Response(
        JSON.stringify({ error: `Could not reach Gemini API: ${(err as Error).message}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!geminiResponse.ok) {
      const detail = (await geminiResponse.text()).slice(0, 500);
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiResponse.status}: ${detail}` }),
        { status: geminiResponse.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const geminiData = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
      }>;
    };

    const parts = geminiData.candidates?.[0]?.content?.parts ?? [];

    // Check for function calls
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No tool call — this is the final text response
      const textPart = parts.find((p) => p.text);
      let responseText = textPart?.text ?? "";

      // Strip markdown code fences if present (e.g. ```json ... ```)
      const cleanJson = responseText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
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
        // Not valid JSON — wrap it
        responseText = JSON.stringify({
          kind: "screen",
          screen: { text: responseText, choices: [], navigation: [] },
          action_proposal: null,
          app_commands: [],
        });
      }

      // Stream the response as SSE (compatible with existing frontend)
      return streamAsSSE(responseText);
    }

    // Process function calls
    const fc = functionCalls[0]!.functionCall!;
    const toolName = resolveToolName(fc.name);
    const toolDef = TOOLS[toolName];

    // If tool requires approval, return an action_proposal instead of executing
    if (requiresApproval(toolName)) {
      // Check if the user already approved this action
      const lastUserMsg = turns[turns.length - 1]?.text ?? "";
      const isApproved = lastUserMsg.toUpperCase().startsWith("APPROVED:");

      if (!isApproved) {
        // Return a screen with action_proposal for human approval
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

    // Add the model's function call and our result to the conversation
    currentContents = [
      ...currentContents,
      {
        role: "model",
        parts: geminiData.candidates?.[0]?.content?.parts ?? [{ functionCall: { name: fc.name, args: fc.args } }],
      },
      {
        role: "user",
        parts: [{
          functionResponse: {
            name: fc.name,
            response: result,
          },
        }],
      },
    ] as typeof currentContents;

    // Continue the loop — Gemini will process the tool result
  }

  // If we exhausted all rounds, return an error
  return new Response(
    JSON.stringify({ error: "Agent exceeded maximum tool-calling rounds" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

/** Streams a complete text response as SSE events (compatible with the voice console frontend). */
function streamAsSSE(fullText: string): Response {
  const encoder = new TextEncoder();
  const chunkSize = 80; // characters per SSE event for realistic streaming

  const stream = new ReadableStream({
    start(controller) {
      let offset = 0;
      const send = () => {
        if (offset < fullText.length) {
          const chunk = fullText.slice(offset, offset + chunkSize);
          offset += chunkSize;
          const event = `data: ${JSON.stringify({ type: "response.output_text.delta", delta: chunk })}\n\n`;
          controller.enqueue(encoder.encode(event));
          // Small delay for natural streaming feel
          setTimeout(send, 15);
        } else {
          // Send done event
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
