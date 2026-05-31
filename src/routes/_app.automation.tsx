import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useRunbooks } from "@/lib/api-hooks";
import { Workflow, Zap, Bell, Globe, Ticket, ArrowRight } from "lucide-react";
import { CircleCheck as CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/automation")({
  head: () => ({ meta: [{ title: "Automation — NEXUS" }] }),
  component: AutomationPage,
});

interface WF {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  status: "active" | "paused";
  lastRun: Date;
  successRate: number;
}

function AutomationPage() {
  const { data, isLoading } = useRunbooks();
  const [enabledOverride, setEnabledOverride] = useState<Record<string, boolean>>({});

  const wfs: WF[] = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((rb, idx) => {
      const active = enabledOverride[rb.id] ?? rb.isAutomated;
      return {
        id: rb.id,
        name: rb.name,
        trigger: rb.description ?? "Runbook trigger",
        actions: rb.steps.map((s) => s.name),
        status: (active ? "active" : "paused") as "active" | "paused",
        lastRun: new Date(Date.now() - (idx + 1) * 3600000),
        successRate: active ? 95 + (idx % 5) : 80,
      };
    });
  }, [data?.items, enabledOverride]);

  const toggleWf = (id: string, currentActive: boolean) =>
    setEnabledOverride((prev) => ({ ...prev, [id]: !currentActive }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" />Automation Workflows</h1>

      {/* Workflows */}
      <div className="rounded-lg border border-border bg-surface/60">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Workflows</span>
          <button className="text-xs px-3 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-1"><Zap className="h-3 w-3" />Create Workflow</button>
        </div>
        <div className="divide-y divide-border">
          {isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading workflows…</div>
          )}
          {!isLoading && wfs.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No runbooks configured.</div>
          )}
          {wfs.map((wf) => (
            <div key={wf.id} className="px-4 py-3 hover:bg-surface transition-colors">
              <div className="flex items-center gap-3">
                <Switch checked={wf.status === "active"} onCheckedChange={() => toggleWf(wf.id, wf.status === "active")} disabled={isLoading} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{wf.name}</span>
                    <span className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded", wf.status === "active" ? "bg-healthy/10 text-healthy border border-healthy/30" : "bg-surface text-muted-foreground border border-border")}>
                      {wf.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Trigger: {wf.trigger}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono">{wf.successRate}% success</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{formatDistanceToNow(wf.lastRun, { addSuffix: true })}</div>
                </div>
              </div>
              {/* Action chain */}
              <div className="flex items-center gap-1.5 mt-2 ml-8 flex-wrap">
                {wf.actions.map((a, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background border border-border">{a}</span>
                    {i < wf.actions.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Jira", status: "connected", icon: Ticket, lastDelivery: "2m ago", successRate: 100 },
          { name: "Slack", status: "connected", icon: Bell, lastDelivery: "30s ago", successRate: 99 },
          { name: "PagerDuty", status: "connected", icon: Globe, lastDelivery: "15m ago", successRate: 100 },
        ].map((int) => (
          <div key={int.name} className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2">
              <int.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{int.name}</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] font-mono text-healthy"><CheckCircle2 className="h-3 w-3" />{int.status}</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-muted-foreground">
              <span>Last: {int.lastDelivery}</span>
              <span>{int.successRate}% success</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
