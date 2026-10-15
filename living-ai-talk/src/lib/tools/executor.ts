/**
 * Tool executor — dispatches tool calls to the correct handler.
 * All tools do REAL work (node:os, node:fs) — no fake/simulated data.
 */
import { resolveToolName, type ToolResult } from "./index.ts";
import { systemDiagnostics } from "./system-diagnostics.ts";
import { inspectLogs } from "./inspect-logs.ts";
import { listServices } from "./list-services.ts";
import { deploy } from "./deploy.ts";
import { restartService } from "./restart-service.ts";

export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
  const resolved = resolveToolName(toolName);

  switch (resolved) {
    case "ops.system_diagnostics":
      return systemDiagnostics();
    case "ops.inspect_logs":
      return inspectLogs(args as { lines?: number; filter?: string });
    case "ops.list_services":
      return listServices(args as { status?: string });
    case "ops.deploy":
      return deploy(args as { service: string; version: string });
    case "ops.restart_service":
      return restartService(args as { service: string; reason?: string });
    default:
      return { success: false, error: `Unknown tool: ${resolved}` };
  }
}
