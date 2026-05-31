import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, KeyRound, User, FileText, Search } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { useAuditLog } from "@/lib/api-hooks";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Log — NEXUS" }] }),
  component: AuditPage,
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useAuditLog(search || undefined);
  const logs = data?.items ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Govern / Audit</div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          {!isError && !isLoading && (
            <p className="text-xs text-healthy mt-1">Live from database — append-only trail</p>
          )}
          {isError && (
            <p className="text-xs text-high mt-1">Failed to load audit log.</p>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter actions, actors…"
            className="bg-transparent text-sm outline-none w-48"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Events / 24h" value={logs.length > 0 ? String(logs.length) : isLoading ? "…" : "0"} icon={Activity} tone="info" />
        <MetricCard label="Unique actors" value={String(new Set(logs.map((l) => l.actor)).size)} icon={User} />
        <MetricCard label="Admin actions" value={String(logs.filter((l) => l.action.includes("rule") || l.action.includes("rbac")).length)} icon={KeyRound} tone="high" />
        <MetricCard label="Retention" value="7 years" icon={FileText} tone="healthy" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading audit events…</div>
        )}
        {!isLoading && logs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No audit events match your filter.</div>
        )}
        {!isLoading && logs.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border bg-surface/40">
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Resource</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((row) => (
                <tr key={row.id} className="hover:bg-accent/30">
                  <td className="px-4 py-2 font-mono text-xs">{row.actor}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.resourceType ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
