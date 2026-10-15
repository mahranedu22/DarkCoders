/**
 * ops.restart_service — ACTUALLY modifies services.json and appends to service.log.
 * Destructive → requires human approval (risk: high).
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { ToolResult } from "./index.ts";
import { readServicesState, writeServicesState } from "./list-services.ts";

const LOG_PATH = path.resolve(process.cwd(), "openclaw", "state", "service.log");

export async function restartService(args: { service: string; reason?: string }): Promise<ToolResult> {
  try {
    const state = readServicesState();

    // Find the service
    const svc = state.services.find((s) => s.name === args.service);
    if (!svc) {
      const available = state.services.map((s) => s.name).join(", ");
      return { success: false, error: `Service '${args.service}' not found. Available services: ${available}` };
    }

    const now = new Date().toISOString();
    const previousStatus = svc.status;
    const reason = args.reason ?? "Requested via voice agent";

    // ACTUALLY modify the state
    svc.status = "running";
    svc.lastRestart = now;

    // Write modified state back to disk
    writeServicesState(state);

    // Append real log entries
    const logLines = [
      `[${now}] [INFO] ${args.service} restart initiated — reason: ${reason}`,
      `[${now}] [INFO] ${args.service} previous status: ${previousStatus}`,
      `[${now}] [INFO] ${args.service} restarted successfully (v${svc.version})`,
    ];
    fs.appendFileSync(LOG_PATH, logLines.join("\n") + "\n", "utf-8");

    return {
      success: true,
      data: {
        service: args.service,
        previousStatus,
        newStatus: "running",
        version: svc.version,
        env: svc.env,
        reason,
        timestamp: now,
        message: `Successfully restarted ${args.service} (was ${previousStatus}, now running)`,
      },
    };
  } catch (err) {
    return { success: false, error: `Restart failed: ${(err as Error).message}` };
  }
}
