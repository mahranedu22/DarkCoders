/**
 * ops.list_services — reads REAL service state from openclaw/state/services.json.
 * Uses node:fs, no side effects, no approval needed.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { ToolResult } from "./index.ts";

const STATE_PATH = path.resolve(process.cwd(), "openclaw", "state", "services.json");

export interface ServiceEntry {
  name: string;
  status: string;
  version: string;
  env: string;
  lastRestart: string;
}

export interface BuildEntry {
  version: string;
  status: string;
  builtAt: string;
}

export interface ServicesState {
  services: ServiceEntry[];
  builds: BuildEntry[];
}

export function readServicesState(): ServicesState {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error(`State file not found at path: ${STATE_PATH}`);
  }
  const raw = fs.readFileSync(STATE_PATH, "utf-8");
  return JSON.parse(raw) as ServicesState;
}

export function writeServicesState(state: ServicesState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export async function listServices(args: { status?: string } = {}): Promise<ToolResult> {
  try {
    const state = readServicesState();
    let services = state.services;

    if (args.status) {
      services = services.filter((s) => s.status.toLowerCase() === args.status!.toLowerCase());
    }

    return {
      success: true,
      data: {
        path: STATE_PATH,
        total: state.services.length,
        filtered: services.length,
        statusFilter: args.status ?? null,
        services,
        builds: state.builds,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to read services: ${(err as Error).message}` };
  }
}
