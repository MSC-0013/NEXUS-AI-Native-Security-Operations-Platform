import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useAssignRunbook, useRunbooks } from "@/lib/api-hooks";
import { Workflow, Zap, Bell, Globe, Ticket, ArrowRight, UserPlus } from "lucide-react";
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
  const assignRunbook = useAssignRunbook();
  const [enabledOverride, setEnabledOverride] = useState<Record<string, boolean>>({});
  const [assignTarget, setAssignTarget] = useState<WF | null>(null);
  const [assignee, setAssignee] = useState("soc-oncall");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("high");

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
                <button
                  onClick={() => setAssignTarget(wf)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <UserPlus className="size-3.5" /> Assign
                </button>
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
      {assignTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Workflow assignment</div>
                <h2 className="text-lg font-semibold">{assignTarget.name}</h2>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-muted-foreground hover:text-foreground">close</button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">Assignee</label>
                <input
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as typeof priority)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {["low", "medium", "high", "critical"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                {assignTarget.actions.length} actions will be queued for the assignee, with audit history retained in the runbook backend.
              </div>
              <button
                onClick={() =>
                  assignRunbook.mutate(
                    { id: assignTarget.id, assignee: assignee.trim() || "soc-oncall", priority },
                    { onSuccess: () => setAssignTarget(null) },
                  )
                }
                disabled={assignRunbook.isPending}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Assign workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
