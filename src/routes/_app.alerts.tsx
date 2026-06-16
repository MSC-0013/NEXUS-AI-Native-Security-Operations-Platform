import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { Bell, BellRing, ListFilter as Filter, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Clock, VolumeX, Zap, Timer, ArrowRight, Mail, MessageSquare, Radio, Globe, Shield, ChevronDown, EyeOff, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAlerts, useCreateIncidentFromAlert, useSuppressSimilarAlerts, useSuppressionRules, useUpdateSuppressionRule, useCreateSuppressionRule, useDeleteSuppressionRule } from "@/lib/api-hooks";
import { Switch } from "@/components/ui/switch";
import { useInspector } from "@/lib/inspector-store";
import type { SeverityLevel as Severity } from "@nexus/shared";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Alerts â€” NEXUS" }] }),
  component: AlertsPage,
});

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

type AlertState = "OPEN" | "TRIAGE" | "ACK" | "SNOOZED" | "MUTED";

interface Alert {
  id: string;
  title: string;
  source: string;
  owner: string;
  age: Date;
  state: AlertState;
  severity: Severity;
  dedupCount: number;
  aiScore: number;
  aiReason: string;
}



interface SuppressionRule {
  name: string;
  condition: string;
  createdBy: string;
  expiresAt: string;
  active: boolean;
}

const SUPPRESSIONS: SuppressionRule[] = [
  { name: "Suppress scan noise", condition: "source = suricata AND severity < high AND port IN (443, 80)", createdBy: "soc-tier1", expiresAt: "2026-06-01T00:00:00Z", active: true },
  { name: "Ignore known scanner IPs", condition: "sourceIp IN threat_intel.known_scanners", createdBy: "amelia.lee", expiresAt: "Never", active: true },
  { name: "Mute compliance reminders", condition: "category = compliance AND severity = info", createdBy: "j.okafor", expiresAt: "2026-07-15T00:00:00Z", active: true },
  { name: "Suppress dev EDR alerts", condition: "host LIKE 'dev-%' AND rule = EDR-1042", createdBy: "platform", expiresAt: "2026-05-30T00:00:00Z", active: false },
];

interface EscalationTier {
  label: string;
  target: string;
  after: string;
}

const ESCALATION_CHAIN: EscalationTier[] = [
  { label: "Tier 1", target: "SOC Analyst on-call", after: "0 min" },
  { label: "Tier 2", target: "Senior Analyst", after: "15 min" },
  { label: "Tier 3", target: "Incident Commander", after: "30 min" },
  { label: "Manager", target: "SOC Manager", after: "60 min" },
];

interface RoutingRule {
  condition: string;
  channels: string[];
}

const ROUTING_RULES: RoutingRule[] = [
  { condition: "severity = critical", channels: ["pagerduty", "slack-secops", "email-oncall"] },
  { condition: "severity = high AND source = edr-*", channels: ["slack-secops", "email-oncall"] },
  { condition: "severity = medium AND state = OPEN", channels: ["slack-secops"] },
  { condition: "source = okta AND type = brute_force", channels: ["slack-identity", "email-oncall"] },
  { condition: "severity = info", channels: ["slack-monitoring"] },
];

type ChannelKind = "email" | "slack" | "pagerduty" | "webhook";

interface NotificationChannel {
  kind: ChannelKind;
  name: string;
  status: "healthy" | "degraded" | "offline";
  lastDelivery: string;
}

const CHANNELS: NotificationChannel[] = [
  { kind: "email", name: "email-oncall", status: "healthy", lastDelivery: "2m ago" },
  { kind: "slack", name: "slack-secops", status: "healthy", lastDelivery: "30s ago" },
  { kind: "slack", name: "slack-identity", status: "healthy", lastDelivery: "12m ago" },
  { kind: "slack", name: "slack-monitoring", status: "degraded", lastDelivery: "8m ago" },
  { kind: "pagerduty", name: "pagerduty", status: "healthy", lastDelivery: "1m ago" },
  { kind: "webhook", name: "webhook-splunk", status: "offline", lastDelivery: "45m ago" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATE_STYLE: Record<AlertState, string> = {
  OPEN: "bg-critical/15 text-critical border-critical/40",
  TRIAGE: "bg-high/15 text-high border-high/40",
  ACK: "bg-healthy/15 text-healthy border-healthy/40",
  SNOOZED: "bg-info/15 text-info border-info/40",
  MUTED: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/40",
};

const SNOOZE_OPTIONS = [
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 hr", ms: 60 * 60_000 },
  { label: "4 hr", ms: 4 * 60 * 60_000 },
  { label: "24 hr", ms: 24 * 60 * 60_000 },
];

function ChannelIcon({ kind }: { kind: ChannelKind }) {
  switch (kind) {
    case "email": return <Mail className="size-3.5" />;
    case "slack": return <MessageSquare className="size-3.5" />;
    case "pagerduty": return <Radio className="size-3.5" />;
    case "webhook": return <Globe className="size-3.5" />;
  }
}

const CHANNEL_STATUS_STYLE: Record<NotificationChannel["status"], string> = {
  healthy: "text-healthy",
  degraded: "text-high",
  offline: "text-critical",
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-critical";
  if (score >= 65) return "text-high";
  if (score >= 45) return "text-medium";
  return "text-info";
}

function scoreBg(score: number): string {
  if (score >= 85) return "bg-critical/10 border-critical/30";
  if (score >= 65) return "bg-high/10 border-high/30";
  if (score >= 45) return "bg-medium/10 border-medium/30";
  return "bg-info/10 border-info/30";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function AlertsPage() {
  const navigate = useNavigate();
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [snoozePickerId, setSnoozePickerId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const openInspector = useInspector((s) => s.open);

  const { data: apiAlerts } = useAlerts({ limit: 100 });
  const suppressSimilar = useSuppressSimilarAlerts();
  const createIncident = useCreateIncidentFromAlert();
  const { data: suppressionData } = useSuppressionRules();
  const updateRule = useUpdateSuppressionRule();
  const createRule = useCreateSuppressionRule();
  const deleteRule = useDeleteSuppressionRule();
  const suppressionRules = suppressionData?.items ?? [];
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleCondition, setNewRuleCondition] = useState("");
  const rawAlerts = useMemo<Alert[]>(() => {
    if (!apiAlerts?.items) return [];
    return apiAlerts.items.map((a) => ({
      id: a.id,
      title: a.rule,
      source: a.source,
      owner: a.owner ?? "â€”",
      age: new Date(a.createdAt),
      state: (a.suppressed ? "SNOOZED" : a.acknowledged ? "ACK" : a.escalated ? "TRIAGE" : "OPEN") as AlertState,
      severity: a.severity,
      dedupCount: a.dedupCount,
      aiScore: a.aiPriorityScore,
      aiReason: a.description ?? "Alert triggered",
    }));
  }, [apiAlerts]);

  const enrichedAlerts = useMemo(() =>
    rawAlerts.map((a) => ({
      ...a,
      state: mutedIds.has(a.id) ? "MUTED" as AlertState : snoozedIds.has(a.id) ? "SNOOZED" as AlertState : a.state,
    })),
    [rawAlerts, mutedIds, snoozedIds],
  );

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "all") return enrichedAlerts;
    return enrichedAlerts.filter((a) => a.severity === severityFilter);
  }, [enrichedAlerts, severityFilter]);

  const totalDedup = useMemo(() => rawAlerts.reduce((s, a) => s + a.dedupCount, 0), [rawAlerts]);
  const autoSuppressed = useMemo(() => rawAlerts.filter((a) => a.dedupCount > 10).length, [rawAlerts]);

  const kpis = [
    { label: "Active", value: rawAlerts.length, icon: BellRing, tone: "critical" as const, delta: { v: "12%", up: true } },
    { label: "Acknowledged", value: rawAlerts.filter(a => a.state === "ACK").length, icon: CheckCircle2, tone: "healthy" as const },
    { label: "Avg ack time", value: "3m 12s", icon: Clock, tone: "info" as const },
    { label: "Suppressed", value: rawAlerts.filter(a => a.state === "SNOOZED").length, icon: Filter, tone: "default" as const },
    { label: "SLA breaches", value: 7, icon: AlertTriangle, tone: "high" as const },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1700px] mx-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Operate / Alerts</div>
        <h1 className="text-2xl font-semibold tracking-tight">Alert Management</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <MetricCard key={k.label} {...k} />
        ))}
      </div>

      {/* Alert table */}
      <div className="rounded-lg border border-border bg-surface/60">
        <div className="flex flex-wrap items-center gap-2 p-2.5 border-b border-border">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mr-2">Severity:</div>
          {(["all", "critical", "high", "medium", "info"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-mono uppercase tracking-wider",
                severityFilter === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[11px] font-mono text-muted-foreground">{filteredAlerts.length} alerts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                <th className="px-4 py-2 font-medium w-8" />
                <th className="px-4 py-2 font-medium">Alert</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Age</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Dedup</th>
                <th className="px-4 py-2 font-medium">AI Priority</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAlerts.map((a) => (
                <tr key={a.id} className="hover:bg-accent/40 group">
                  <td className="px-4 py-3">
                    <BellRing className={cn("size-4", a.severity === "critical" ? "text-critical animate-pulse" : "text-muted-foreground")} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] font-mono text-muted-foreground">{a.id}</div>
                    <div className="text-sm leading-snug">{a.title}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">{a.source}</td>
                  <td className="px-4 py-3 text-[12px] font-mono">{a.owner}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(a.age, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono", STATE_STYLE[a.state])}>
                      {a.state}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-4 py-3">
                    {a.dedupCount > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-mono text-info">
                        <EyeOff className="size-3" /> {a.dedupCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">1</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono tabular-nums", scoreBg(a.aiScore), scoreColor(a.aiScore))}>
                        <Sparkles className="size-3" /> {a.aiScore}
                      </span>
                      <span className="hidden xl:inline text-[10px] text-muted-foreground max-w-[120px] truncate" title={a.aiReason}>
                        {a.aiReason}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setMutedIds((prev) => { const next = new Set(prev); next.has(a.id) ? next.delete(a.id) : next.add(a.id); return next; })}
                        className={cn(
                          "rounded border px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider hover:bg-accent",
                          mutedIds.has(a.id) ? "border-muted-foreground/40 bg-muted-foreground/10 text-muted-foreground" : "border-border text-muted-foreground",
                        )}
                        title={mutedIds.has(a.id) ? "Unmute" : "Mute"}
                      >
                        <VolumeX className="size-3" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setSnoozePickerId(snoozePickerId === a.id ? null : a.id)}
                          className={cn(
                            "rounded border px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider hover:bg-accent",
                            snoozedIds.has(a.id) ? "border-info/40 bg-info/10 text-info" : "border-border text-muted-foreground",
                          )}
                          title="Snooze"
                        >
                          <Timer className="size-3" />
                        </button>
                        {snoozePickerId === a.id && (
                          <div className="absolute right-0 top-7 z-20 rounded-md border border-border bg-surface p-1 shadow-lg min-w-[100px]">
                            {SNOOZE_OPTIONS.map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() => { setSnoozedIds((prev) => new Set(prev).add(a.id)); setSnoozePickerId(null); }}
                                className="block w-full text-left px-2 py-1 text-[11px] font-mono hover:bg-accent rounded"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openInspector({ kind: "event", event: { id: a.id, timestamp: a.age.toISOString(), type: "malware_detection", severity: a.severity, source: a.source, sourceIp: "0.0.0.0", destIp: "0.0.0.0", user: a.owner, host: "", rule: a.title, message: a.title, country: "US", asset: "", mitre: "", raw: {} } })}
                        className="rounded border border-border px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:bg-accent"
                        title="Inspect"
                      >
                        <Shield className="size-3" />
                      </button>
                      <button
                        onClick={() => suppressSimilar.mutate({ id: a.id, reason: `Suppressed duplicate ${a.title}` })}
                        disabled={suppressSimilar.isPending}
                        className="rounded border border-border px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:bg-accent disabled:opacity-50"
                        title="Suppress similar alerts"
                      >
                        Suppress similar
                      </button>
                      <button
                        onClick={() =>
                          createIncident.mutate(
                            { id: a.id, title: a.title },
                            {
                              onSuccess: (incident) =>
                                navigate({ to: "/incidents/$incidentId", params: { incidentId: incident.code } }),
                            },
                          )
                        }
                        disabled={createIncident.isPending}
                        className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50"
                        title="Create incident from alert"
                      >
                        Create incident
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom sections: 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* -- Suppression Rules -- */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <EyeOff className="size-4 text-muted-foreground" /> Suppression Rules
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{suppressionRules.filter((r) => r.isActive).length} active</span>
              <button onClick={() => setShowNewRule(true)} className="text-[10px] font-mono text-primary hover:underline">+ new</button>
            </div>
          </div>
          {showNewRule && (
            <div className="rounded-md border border-border p-2.5 space-y-2 bg-surface/80">
              <input
                className="w-full text-[11px] bg-transparent border-b border-border pb-1 outline-none"
                placeholder="Rule name"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
              />
              <input
                className="w-full text-[11px] font-mono bg-transparent border-b border-border pb-1 outline-none"
                placeholder="condition expression"
                value={newRuleCondition}
                onChange={(e) => setNewRuleCondition(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { if (newRuleName.trim() && newRuleCondition.trim()) { createRule.mutate({ name: newRuleName.trim(), condition: newRuleCondition.trim() }, { onSuccess: () => { setNewRuleName(""); setNewRuleCondition(""); setShowNewRule(false); } }); } }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >Save</button>
                <button onClick={() => setShowNewRule(false)} className="text-[11px] text-muted-foreground hover:underline">Cancel</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {suppressionRules.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-4">No suppression rules. Click "+ new" to add one.</p>
            )}
            {suppressionRules.map((rule) => (
              <div key={rule.id} className={cn("rounded-md border border-border p-2.5 space-y-1.5", !rule.isActive && "opacity-50")}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium">{rule.name}</span>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(v) => updateRule.mutate({ id: rule.id, isActive: v })}
                    className="scale-75 origin-right"
                  />
                </div>
                <div className="text-[11px] font-mono text-muted-foreground leading-snug">{rule.condition}</div>
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>by {rule.createdBy}</span>
                  <div className="flex items-center gap-2">
                    <span>exp: {rule.expiresAt ? formatDistanceToNow(new Date(rule.expiresAt), { addSuffix: true }) : "Never"}</span>
                    <button onClick={() => { if (confirm("Delete this rule?")) deleteRule.mutate(rule.id); }} className="text-critical/60 hover:text-critical text-[10px]">âœ•</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Dedup summary */}
          <div className="rounded-md border border-info/20 bg-info/5 p-2.5 flex items-center gap-2">
            <EyeOff className="size-3.5 text-info" />
            <div className="text-[11px]">
              <span className="font-mono text-info">{totalDedup}</span> duplicate alerts auto-suppressed across{" "}
              <span className="font-mono text-info">{autoSuppressed}</span> groups
            </div>
          </div>
        </div>

        {/* -- Escalation Chain -- */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Zap className="size-4 text-muted-foreground" /> Escalation Policy
          </h2>
          <div className="space-y-0">
            {ESCALATION_CHAIN.map((tier, i) => (
              <div key={i} className="flex items-stretch">
                {/* Timeline rail */}
                <div className="flex flex-col items-center w-10 shrink-0">
                  <div className={cn(
                    "size-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-semibold",
                    i === 0 ? "border-critical bg-critical/15 text-critical" :
                    i === 1 ? "border-high bg-high/15 text-high" :
                    i === 2 ? "border-medium bg-medium/15 text-medium" :
                    "border-info bg-info/15 text-info",
                  )}>
                    {i + 1}
                  </div>
                  {i < ESCALATION_CHAIN.length - 1 && (
                    <div className="w-px flex-1 bg-border min-h-[16px]" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pb-3 pl-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-semibold">{tier.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> after {tier.after}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{tier.target}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Timing summary */}
          <div className="rounded-md border border-border bg-background/50 p-2.5 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Auto-escalation timing</div>
            <div className="flex items-center gap-1 text-[11px]">
              {ESCALATION_CHAIN.map((tier, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="font-mono">{tier.label}</span>
                  {i < ESCALATION_CHAIN.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* -- Routing Rules + Notification Channels -- */}
        <div className="space-y-4">
          {/* Routing Rules */}
          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" /> Routing Rules
            </h2>
            <div className="space-y-2">
              {ROUTING_RULES.map((rule, i) => (
                <div key={i} className="rounded-md border border-border p-2.5 space-y-1">
                  <div className="text-[11px] font-mono text-muted-foreground">{rule.condition}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                    {rule.channels.map((ch) => (
                      <span key={ch} className="inline-flex items-center gap-1 rounded border border-border bg-background/50 px-1.5 py-0.5 text-[10px] font-mono">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" /> Notification Channels
            </h2>
            <div className="space-y-1.5">
              {CHANNELS.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ChannelIcon kind={ch.kind} />
                    <span className="text-[12px] font-mono">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">last: {ch.lastDelivery}</span>
                    <span className={cn("text-[10px] font-mono uppercase tracking-wider", CHANNEL_STATUS_STYLE[ch.status])}>
                      {ch.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

