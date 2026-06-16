import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bug, Package, Shield, ShieldAlert, Wrench, Zap, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { cn } from "@/lib/utils";
import { useVulnerabilities, usePatchVulnerability } from "@/lib/api-hooks";
import type { SeverityLevel } from "@nexus/shared";

export const Route = createFileRoute("/_app/vulnerabilities")({
  head: () => ({ meta: [{ title: "Vulnerabilities — NEXUS" }] }),
  component: VulnerabilitiesPage,
});

const SEV_STYLE: Record<string, string> = {
  critical: "text-critical",
  high: "text-high",
  medium: "text-medium",
  low: "text-info",
  info: "text-info",
};

const PATCH_STYLE: Record<string, string> = {
  patched: "bg-healthy/15 text-healthy border-healthy/40",
  unpatched: "bg-high/15 text-high border-high/40",
  dismissed: "bg-surface-2 text-muted-foreground border-border",
  in_progress: "bg-medium/15 text-medium border-medium/40",
};

function VulnerabilitiesPage() {
  const { data, isLoading, isError } = useVulnerabilities();
  const patchVuln = usePatchVulnerability();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const critical = items.filter((v) => v.severity === "critical").length;
  const high = items.filter((v) => v.severity === "high").length;
  const exploited = items.filter((v) => v.exploitStatus !== "none" && v.exploitStatus !== "unknown").length;

  const sev = (s: string): SeverityLevel =>
    s === "critical" ? "critical" : s === "high" ? "high" : s === "medium" ? "medium" : "info";

  const handlePatch = (id: string, status: string) => {
    setPendingId(id);
    patchVuln.mutate(
      { id, patchStatus: status },
      { onSettled: () => setPendingId(null) },
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* header */}
      <div className="border-b border-border bg-surface/40 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
            <Shield className="size-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Detect</div>
            <h1 className="text-xl font-semibold tracking-tight">Vulnerabilities</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Prioritized vulnerability management with EPSS scoring and exploit intelligence.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Open CVEs" value={isLoading ? "…" : items.length} icon={Bug} tone="high" />
          <MetricCard label="Critical" value={isLoading ? "…" : critical} icon={Zap} tone="critical" />
          <MetricCard label="High" value={isLoading ? "…" : high} icon={ShieldAlert} tone="high" />
          <MetricCard label="Known exploited" value={isLoading ? "…" : exploited} icon={Wrench} tone="critical" />
          <MetricCard label="Assets (sum)" value={isLoading ? "…" : items.reduce((s, v) => s + v.assetCount, 0)} icon={Package} tone="info" />
        </div>

        {/* vulnerability table */}
        <div className="rounded-lg border border-border bg-surface/60">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Vulnerability List</div>
            <div className="text-[10px] font-mono text-muted-foreground">{items.length} CVEs</div>
          </div>

          {isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading vulnerabilities…</div>
          )}
          {isError && (
            <div className="px-4 py-8 text-center text-sm text-destructive">Failed to load vulnerabilities.</div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No vulnerabilities found.</div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border/50">
                    <th className="px-4 py-2 font-medium">CVE</th>
                    <th className="px-4 py-2 font-medium">Severity</th>
                    <th className="px-4 py-2 font-medium">CVSS</th>
                    <th className="px-4 py-2 font-medium">EPSS</th>
                    <th className="px-4 py-2 font-medium">Assets</th>
                    <th className="px-4 py-2 font-medium">Patch Status</th>
                    <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((v) => {
                    const isPending = pendingId === v.id;
                    return (
                      <tr key={v.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{v.cve}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-semibold font-mono uppercase", SEV_STYLE[v.severity] ?? "")}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{v.cvss.toFixed(1)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{v.epss.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{v.assetCount}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider",
                            PATCH_STYLE[v.patchStatus] ?? "bg-surface-2 text-muted-foreground border-border",
                          )}>
                            {v.patchStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {v.patchStatus !== "patched" && v.patchStatus !== "dismissed" ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                disabled={isPending}
                                onClick={() => handlePatch(v.id, "patched")}
                                className="inline-flex items-center gap-1 rounded border border-healthy/40 bg-healthy/10 px-2 py-1 text-[10px] font-mono text-healthy hover:bg-healthy/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <CheckCircle className="size-3" />
                                {isPending ? "…" : "Mark Patched"}
                              </button>
                              <button
                                disabled={isPending}
                                onClick={() => handlePatch(v.id, "dismissed")}
                                className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <XCircle className="size-3" />
                                {isPending ? "…" : "Dismiss"}
                              </button>
                            </div>
                          ) : v.patchStatus === "patched" ? (
                            <button
                              disabled={isPending}
                              onClick={() => handlePatch(v.id, "unpatched")}
                              className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                            >
                              <AlertCircle className="size-3" />
                              Reopen
                            </button>
                          ) : (
                            <button
                              disabled={isPending}
                              onClick={() => handlePatch(v.id, "unpatched")}
                              className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                            >
                              <AlertCircle className="size-3" />
                              Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* risk distribution */}
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Risk Distribution</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["critical", "high", "medium", "low"] as const).map((s) => {
              const count = items.filter((v) => {
                if (s === "low") return v.severity === "low" || v.severity === "info";
                return v.severity === s;
              }).length;
              return (
                <div key={s} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                  <span className={cn("text-[10px] font-mono uppercase font-semibold", SEV_STYLE[s])}>{s}</span>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
