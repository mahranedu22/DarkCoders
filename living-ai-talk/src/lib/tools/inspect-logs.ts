/**
 * ops.inspect_logs — reads REAL log file from openclaw/state/service.log.
 * Uses node:fs, no side effects, no approval needed.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { ToolResult } from "./index.ts";

const LOG_PATH = path.resolve(process.cwd(), "openclaw", "state", "service.log");

export async function inspectLogs(args: { lines?: number; filter?: string }): Promise<ToolResult> {
  const maxLines = Math.min(Math.max(args.lines ?? 20, 1), 100);

  try {
    if (!fs.existsSync(LOG_PATH)) {
      return { success: false, error: `Log file not found at path: ${LOG_PATH}` };
    }

    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    let lines = raw.split("\n").filter((l) => l.trim().length > 0);

    // Apply filter if provided (matches severity or any keyword like worker-02 or OOM)
    if (args.filter) {
      const needle = args.filter.toLowerCase();
      lines = lines.filter((l) => l.toLowerCase().includes(needle));
    }

    // Take last N lines
    const result = lines.slice(-maxLines);

    return {
      success: true,
      data: {
        path: LOG_PATH,
        totalLines: lines.length,
        returned: result.length,
        filter: args.filter ?? null,
        lines: result,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to read log file: ${(err as Error).message}` };
  }
}
