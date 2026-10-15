/**
 * Tool registry — defines every tool the DevOps agent can use.
 *
 * Read-only tools run without approval.
 * State-changing tools require an action_proposal + human approval.
 */

export type ToolRisk = "none" | "low" | "medium" | "high";

export interface ToolDefinition {
  name: string;
  description: string;
  risk: ToolRisk;
  parameters: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** All tools available to the DevOps agent, keyed by tool name. */
export const TOOLS: Record<string, ToolDefinition> = {
  "ops.system_diagnostics": {
    name: "ops.system_diagnostics",
    description: "Read real system metrics — CPU usage, memory (total/free/used), platform, uptime, and process info. Uses node:os, no side effects.",
    risk: "none",
    parameters: {},
  },
  "ops.inspect_logs": {
    name: "ops.inspect_logs",
    description: "Read the last N lines from the real service log file at openclaw/state/service.log. Returns actual file contents using node:fs.",
    risk: "none",
    parameters: {
      lines: { type: "number", description: "Number of most-recent lines to return (default 20, max 100)", required: false },
      filter: { type: "string", description: "Optional severity filter: INFO, WARN, ERROR", required: false, enum: ["INFO", "WARN", "ERROR"] },
    },
  },
  "ops.list_services": {
    name: "ops.list_services",
    description: "Read the current service roster and build list from the real openclaw/state/services.json file. No side effects.",
    risk: "none",
    parameters: {
      status: { type: "string", description: "Optional status filter (e.g. running, crash-looping, stopped)", required: false },
    },
  },
  "ops.deploy": {
    name: "ops.deploy",
    description: "Deploy a ready build version to a staging service. Actually modifies services.json on disk and appends a real entry to service.log. Production deploys are refused.",
    risk: "medium",
    parameters: {
      service: { type: "string", description: "Name of the service to deploy to", required: true },
      version: { type: "string", description: "Build version to deploy (must be in 'ready' state)", required: true },
    },
  },
  "ops.restart_service": {
    name: "ops.restart_service",
    description: "Restart a service by name. Actually modifies the service status in services.json and writes a restart entry to service.log. This is a destructive operation.",
    risk: "high",
    parameters: {
      service: { type: "string", description: "Name of the service to restart", required: true },
      reason: { type: "string", description: "Reason for the restart (logged to service.log)", required: false },
    },
  },
};

/** Returns tool definitions formatted for the Gemini function-calling API. */
export function toolsForGemini(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
  return Object.values(TOOLS).map((t) => ({
    name: t.name.replace(/\./g, "_"),
    description: t.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([key, p]) => [
          key,
          { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) },
        ]),
      ),
      required: Object.entries(t.parameters)
        .filter(([, p]) => p.required)
        .map(([k]) => k),
    },
  }));
}

/** Maps tool names (with underscore or without namespace) back to the canonical dotted name. */
export function resolveToolName(name: string): string {
  if (name.startsWith("ops_")) return name.replace(/^ops_/, "ops.");
  if (!name.startsWith("ops.")) return `ops.${name}`;
  return name;
}

/** Returns true if the tool requires human approval before execution. */
export function requiresApproval(toolName: string): boolean {
  const tool = TOOLS[toolName];
  return !!tool && (tool.risk === "medium" || tool.risk === "high");
}
