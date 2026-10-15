/**
 * ops.deploy — ACTUALLY modifies services.json and appends to service.log.
 * State-changing → requires human approval (risk: medium).
 *
 * Rules enforced:
 * - Build version must exist and be in "ready" state
 * - Target service must exist
 * - Production deploys are refused (safety guardrail)
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { ToolResult } from "./index";
import { readServicesState, writeServicesState } from "./list-services";

const LOG_PATH = path.resolve(process.cwd(), "openclaw", "state", "service.log");

export async function deploy(args: { service: string; version: string }): Promise<ToolResult> {
  try {
    const state = readServicesState();

    // Find the target service
    const svc = state.services.find((s) => s.name === args.service);
    if (!svc) {
      const available = state.services.map((s) => s.name).join(", ");
      return { success: false, error: `Service '${args.service}' not found. Available services: ${available}` };
    }

    // Refuse production deploys — real safety guardrail
    if (svc.env === "production") {
      return { success: false, error: `Production deploys are not available via voice. Service '${args.service}' is in the production environment. Use the deployment pipeline instead.` };
    }

    // Find the build version
    const build = state.builds.find((b) => b.version === args.version);
    if (!build) {
      const available = state.builds.map((b) => `${b.version} (${b.status})`).join(", ");
      return { success: false, error: `Build version '${args.version}' not found. Available builds: ${available}` };
    }

    if (build.status !== "ready") {
      return { success: false, error: `Build '${args.version}' is not deployable — current status: ${build.status}` };
    }

    // Perform the deploy — ACTUALLY modify state
    const previousVersion = svc.version;
    const now = new Date().toISOString();

    svc.version = args.version;
    svc.status = "running";
    svc.lastRestart = now;

    // Mark the build as deployed, previous build as superseded
    build.status = "deployed";
    const prevBuild = state.builds.find((b) => b.version === previousVersion && b.status === "deployed");
    if (prevBuild) prevBuild.status = "superseded";

    // Write modified state back to disk
    writeServicesState(state);

    // Append real log entry
    const logEntry = `[${now}] [INFO] ${args.service} deployed from v${previousVersion} to v${args.version} (via voice agent)\n`;
    fs.appendFileSync(LOG_PATH, logEntry, "utf-8");

    return {
      success: true,
      data: {
        service: args.service,
        previousVersion,
        newVersion: args.version,
        env: svc.env,
        timestamp: now,
        message: `Successfully deployed ${args.service} from v${previousVersion} to v${args.version}`,
      },
    };
  } catch (err) {
    return { success: false, error: `Deploy failed: ${(err as Error).message}` };
  }
}
