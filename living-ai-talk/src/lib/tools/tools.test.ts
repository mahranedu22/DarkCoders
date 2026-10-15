import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { executeTool } from "./executor.ts";
import { resolveToolName, requiresApproval } from "./index.ts";
import { listServices } from "./list-services.ts";
import { systemDiagnostics } from "./system-diagnostics.ts";
import { inspectLogs } from "./inspect-logs.ts";

describe("OpenClaw Ops Tools — Real Execution", () => {
  it("resolves tool names with or without namespace prefix", () => {
    assert.equal(resolveToolName("list_services"), "ops.list_services");
    assert.equal(resolveToolName("ops.list_services"), "ops.list_services");
    assert.equal(resolveToolName("deploy"), "ops.deploy");
    assert.equal(resolveToolName("ops.deploy"), "ops.deploy");
  });

  it("accurately identifies dangerous vs read-only operations", () => {
    assert.equal(requiresApproval("ops.list_services"), false);
    assert.equal(requiresApproval("ops.system_diagnostics"), false);
    assert.equal(requiresApproval("ops.inspect_logs"), false);
    assert.equal(requiresApproval("ops.deploy"), true);
    assert.equal(requiresApproval("ops.restart_service"), true);
  });

  it("reads real services from openclaw/state/services.json", async () => {
    const res = await listServices();
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.data?.["services"]));
    const services = res.data?.["services"] as Array<{ name: string; status: string }>;
    const worker2 = services.find((s) => s.name === "worker-02");
    assert.ok(worker2, "worker-02 must exist in services.json");
    assert.equal(worker2?.status, "crash-looping");
  });

  it("gathers real system diagnostics via node:os", async () => {
    const res = await systemDiagnostics();
    assert.equal(res.success, true);
    assert.ok(res.data?.["cpu"]);
    assert.ok(res.data?.["memory"]);
    const uptimeObj = res.data?.["uptime"] as { system: number } | undefined;
    assert.ok(typeof uptimeObj?.system === "number");
    assert.ok(res.data?.["platform"]);
  });

  it("inspects real log entries with optional filter", async () => {
    const allLogs = await inspectLogs({ lines: 10 });
    assert.equal(allLogs.success, true);
    assert.ok(Array.isArray(allLogs.data?.["lines"]));

    const filtered = await inspectLogs({ filter: "crash-looping" });
    assert.equal(filtered.success, true);
    const lines = filtered.data?.["lines"] as string[];
    assert.ok(lines.length > 0);
    assert.ok(lines.some((l) => l.includes("crash-looping")));
  });

  it("refuses deployment to production", async () => {
    const res = await executeTool("ops.deploy", { service: "redis-cache", version: "2.4.1" });
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /production/i);
  });

  it("refuses deployment of non-existent build versions", async () => {
    const res = await executeTool("ops.deploy", { service: "worker-01", version: "9.9.9-ghost" });
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /9\.9\.9-ghost/i);
  });

  it("reports real error when requesting unknown tool", async () => {
    const res = await executeTool("ops.non_existent_tool", {});
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /Unknown tool/i);
  });
});
