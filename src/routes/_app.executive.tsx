import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { WorkspaceContext } from "@/components/workspace-context";
import { useExecutiveSummary } from "@/lib/api-hooks";
import { ChartBar as BarChart3, Shield, TrendingDown, Clock, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
export const Route = createFileRoute("/_app/executive")({
  head: () => ({ meta: [{ title: "Executive Dashboard — NEXUS" }] }),
  component: ExecutiveDashboard,
});

function ExecutiveDashboard() {
  const { data: summary, isLoading } = useExecutiveSummary();

  const riskTrends = summary?.riskBySeverity ?? [];
  const compliance = summary?.compliance ?? [];
  const financial = summary?.financial ?? [];
  const sla = summary?.sla ?? [];
  const attackTrends = summary?.attackTrends ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Executive Dashboard</h1>
        <span className="text-[10px] font-mono text-muted-foreground">{isLoading ? "Loading…" : "Live from API"}</span>
      </div>

      <WorkspaceContext />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Risk Posture"
          value={summary ? `${summary.riskPosture}/10` : "—"}
          icon={Shield}
          tone="healthy"
        />
        <MetricCard
          label="Open Incidents"
          value={summary ? String(summary.openIncidents) : "—"}
          icon={AlertTriangle}
          tone="high"
        />
        <MetricCard
          label="SLA Compliance"
          value={summary ? `${summary.slaCompliancePct}%` : "—"}
          icon={Clock}
          tone="default"
        />
        <MetricCard
          label="Mean Time to Detect"
          value={summary ? `${summary.meanTimeToDetectMs}ms` : "—"}
          icon={Activity}
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-border bg-surface/60 p-5 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Risk Posture by Severity</div>
          {riskTrends.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">No risk data available.</p>
          )}
          {riskTrends.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1">
                <span>{r.label}</span>
                <span className="font-mono">{r.value}</span>
              </div>
              <Progress value={r.max > 0 ? (r.value / r.max) * 100 : 0} className="h-2" />
            </div>
          ))}
          <div className="pt-3 border-t border-border flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-healthy" />
            <span className="text-xs text-muted-foreground">Risk posture from executive summary API</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-5 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Compliance Posture</div>
          {compliance.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">No compliance assessments.</p>
          )}
          {compliance.map((c) => (
            <div key={c.framework} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>{c.framework}</span>
                  <span className="font-mono">{c.score}%</span>
                </div>
                <Progress value={c.score} className="h-1.5" />
              </div>
              <span className={cn("text-[9px] font-mono", c.trend.startsWith("+") ? "text-healthy" : c.trend.startsWith("-") ? "text-high" : "text-muted-foreground")}>{c.trend}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-5 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Financial Impact</div>
          {financial.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">No financial metrics.</p>
          )}
          {financial.map((f) => (
            <div key={f.metric} className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">{f.metric}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium">{f.value}</span>
                <span className={cn("text-[9px] font-mono", f.trend.startsWith("-") ? "text-healthy" : "text-high")}>{f.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-surface/60">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SLA Performance</span>
          </div>
          <div className="divide-y divide-border">
            {sla.length === 0 && !isLoading && (
              <div className="px-4 py-6 text-xs text-muted-foreground text-center">No SLA metrics.</div>
            )}
            {sla.map((s) => (
              <div key={s.metric} className="flex items-center gap-3 px-4 py-2.5">
                {s.met ? <CheckCircle2 className="h-4 w-4 text-healthy" /> : <AlertTriangle className="h-4 w-4 text-high" />}
                <div className="flex-1">
                  <div className="text-sm">{s.metric}</div>
                  <div className="text-xs text-muted-foreground">Target: {s.target} | Actual: {s.actual}</div>
                </div>
                <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", s.met ? "bg-healthy/10 text-healthy border border-healthy/30" : "bg-high/10 text-high border border-high/30")}>
                  {s.met ? "MET" : "BREACHED"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4">Attack Trends (30 Day)</div>
          <div className="space-y-3">
            {attackTrends.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">No attack trend data.</p>
            )}
            {attackTrends.map((a) => (
              <div key={a.type} className="flex items-center gap-3">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1">{a.type}</span>
                <span className="text-sm font-mono">{a.count}</span>
                <span className={cn("text-[9px] font-mono", a.change.startsWith("+") && a.change !== "+1" ? "text-high" : a.change.startsWith("-") ? "text-healthy" : "text-muted-foreground")}>{a.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
