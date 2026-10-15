/**
 * ops.system_diagnostics — reads REAL system metrics using node:os.
 * No side effects, no approval needed.
 */
import * as os from "node:os";

import type { ToolResult } from "./index.ts";

export async function systemDiagnostics(): Promise<ToolResult> {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate real CPU usage from cpu times
    const cpuUsage = cpus.map((cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return Math.round(((total - idle) / total) * 100);
    });
    const avgCpu = Math.round(cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length);

    return {
      success: true,
      data: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: {
          system: Math.round(os.uptime()),
          systemHuman: formatUptime(os.uptime()),
          process: Math.round(process.uptime()),
          processHuman: formatUptime(process.uptime()),
        },
        cpu: {
          model: cpus[0]?.model ?? "unknown",
          cores: cpus.length,
          usagePercent: avgCpu,
          perCore: cpuUsage,
        },
        memory: {
          totalGB: +(totalMem / 1e9).toFixed(2),
          usedGB: +(usedMem / 1e9).toFixed(2),
          freeGB: +(freeMem / 1e9).toFixed(2),
          usagePercent: Math.round((usedMem / totalMem) * 100),
        },
        loadAverage: os.loadavg(),
      },
    };
  } catch (err) {
    return { success: false, error: `System diagnostics failed: ${(err as Error).message}` };
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}
