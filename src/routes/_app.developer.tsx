import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Key, Code, Globe, Zap, Copy, Shield, Check, Trash2, Plus, Eye, EyeOff, Activity, Clock, TriangleAlert as AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { Switch } from "@/components/ui/switch";
import { makeMetricSeries } from "@/lib/mock/generators";

export const Route = createFileRoute("/_app/developer")({
  head: () => ({
    meta: [
      { title: "Developer — NEXUS" },
      { name: "description", content: "API keys, webhooks, SDK examples, and usage analytics." },
    ],
  }),
  component: DeveloperPage,
});

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const API_KEYS = [
  { id: "1", name: "Production API", prefix: "sk_nex_a3f8", permissions: ["read", "write", "admin"], created: "2026-03-12", lastUsed: "2 min ago", status: "active" as const },
  { id: "2", name: "Staging Ingest", prefix: "sk_nex_b7d2", permissions: ["read", "write"], created: "2026-04-01", lastUsed: "1 hr ago", status: "active" as const },
  { id: "3", name: "CI/CD Pipeline", prefix: "sk_nex_c9e1", permissions: ["read"], created: "2026-01-18", lastUsed: "5 days ago", status: "active" as const },
  { id: "4", name: "Legacy Integration", prefix: "sk_nex_d4a6", permissions: ["read"], created: "2025-11-05", lastUsed: "42 days ago", status: "revoked" as const },
];

const INGESTION_TOKENS = [
  { id: "t1", name: "Fluentd Forwarder", prefix: "ing_****_x8k2", scope: "logs", created: "2026-04-10", lastPush: "12s ago", status: "active" as const },
  { id: "t2", name: "Syslog Relay", prefix: "ing_****_m3p7", scope: "events", created: "2026-02-28", lastPush: "4m ago", status: "active" as const },
  { id: "t3", name: "OTEL Collector", prefix: "ing_****_q1n9", scope: "traces", created: "2026-05-02", lastPush: "8m ago", status: "active" as const },
];

const WEBHOOKS = [
  { id: "w1", url: "https://api.acme.io/hooks/nexus", events: ["incident.created", "incident.escalated"], status: true, lastDelivery: "3s ago", successRate: 99.8 },
  { id: "w2", url: "https://slack.acme.io/webhook/nexus-alerts", events: ["alert.critical", "alert.high"], status: true, lastDelivery: "1m ago", successRate: 100 },
  { id: "w3", url: "https://pagerduty.acme.io/events", events: ["incident.created"], status: false, lastDelivery: "7d ago", successRate: 87.3 },
];

const SDK_EXAMPLES: Record<string, { label: string; code: string }> = {
  python: {
    label: "Python",
    code: `import nexus

client = nexus.Client(api_key="sk_nex_...")

# Fetch recent incidents
incidents = client.incidents.list(
    severity="critical",
    limit=10,
)

for inc in incidents:
    print(f"[{inc.code}] {inc.title}")`,
  },
  javascript: {
    label: "JavaScript",
    code: `import { NexusClient } from "@nexus/sdk";

const client = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY,
});

// Stream live security events
const stream = client.events.stream({
  severity: ["critical", "high"],
});

for await (const event of stream) {
  console.log(event.message);
}`,
  },
  go: {
    label: "Go",
    code: `package main

import (
    "context"
    "fmt"
    "github.com/nexus/go-sdk"
)

func main() {
    client := nexus.NewClient("sk_nex_...")

    incidents, _ := client.Incidents.List(
        context.Background(),
        &nexus.IncidentFilter{
            Severity: "critical",
            Limit:    10,
        },
    )

    for _, inc := range incidents {
        fmt.Printf("[%s] %s\\n", inc.Code, inc.Title)
    }
}`,
  },
};

const RATE_LIMITS = [
  { plan: "Free", requests: "100 / min", burst: "20", ingestion: "1 GB / day" },
  { plan: "Pro", requests: "1,000 / min", burst: "100", ingestion: "50 GB / day" },
  { plan: "Enterprise", requests: "10,000 / min", burst: "500", ingestion: "Unlimited" },
];

const PERMISSION_SCOPES = [
  { scope: "read", description: "Read events, incidents, assets, and configuration", default: true },
  { scope: "write", description: "Create/update incidents, acknowledge alerts, add comments", default: false },
  { scope: "admin", description: "Manage API keys, webhooks, organization settings", default: false },
  { scope: "ingest", description: "Push logs and events via ingestion endpoints", default: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<"python" | "javascript" | "go">("python");
  const [copied, setCopied] = useState(false);
  const [webhookStatuses, setWebhookStatuses] = useState<Record<string, boolean>>(
    () => Object.fromEntries(WEBHOOKS.map((w) => [w.id, w.status])),
  );
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const metricSeries = useMemo(() => ({
    requests: makeMetricSeries(36, 4200, 600),
    errors: makeMetricSeries(36, 12, 5),
    latency: makeMetricSeries(36, 84, 15),
  }), []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Platform / Developer</div>
        <h1 className="text-2xl font-semibold tracking-tight">API & Developer Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage API keys, ingestion tokens, webhooks, and monitor usage across your integrations.</p>
      </div>

      {/* API Usage Analytics */}
      <section>
        <SectionHeader icon={Activity} title="API Usage Analytics" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Requests / 24h" value="4,218" delta={{ v: "8%", up: true }} icon={Zap} tone="info" series={metricSeries.requests} />
          <MetricCard label="Error Rate" value="0.28%" delta={{ v: "0.05%", up: false }} icon={AlertTriangle} tone="healthy" series={metricSeries.errors} />
          <MetricCard label="Avg Latency" value="84 ms" delta={{ v: "3 ms", up: false }} icon={Clock} tone="default" series={metricSeries.latency} />
        </div>
      </section>

      {/* API Keys */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Key} title="API Keys" />
          <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-3.5" /> Generate Key
          </button>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Key Prefix</th>
                <th className="text-left px-4 py-2.5">Permissions</th>
                <th className="text-left px-4 py-2.5">Created</th>
                <th className="text-left px-4 py-2.5">Last Used</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {API_KEYS.map((key) => (
                <tr key={key.id} className={cn("hover:bg-accent/40", key.status === "revoked" && "opacity-50")}>
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs bg-background/60 rounded px-2 py-0.5 border border-border">
                      {visibleKeys[key.id] ? `${key.prefix}********************************` : `${key.prefix}****`}
                      <button onClick={() => setVisibleKeys((p) => ({ ...p, [key.id]: !p[key.id] }))} className="text-muted-foreground hover:text-foreground">
                        {visibleKeys[key.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      </button>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {key.permissions.map((p) => (
                        <span key={p} className={cn(
                          "text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border",
                          p === "admin" && "border-high/40 text-high bg-high/10",
                          p === "write" && "border-info/40 text-info bg-info/10",
                          p === "read" && "border-healthy/40 text-healthy bg-healthy/10",
                        )}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{key.created}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{key.lastUsed}</td>
                  <td className="px-4 py-3 text-right">
                    {key.status === "active" ? (
                      <button className="text-muted-foreground hover:text-critical transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono uppercase text-critical">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ingestion Tokens */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Globe} title="Ingestion Tokens" />
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm hover:bg-surface">
            <Plus className="size-3.5" /> Create Token
          </button>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Token Prefix</th>
                <th className="text-left px-4 py-2.5">Scope</th>
                <th className="text-left px-4 py-2.5">Created</th>
                <th className="text-left px-4 py-2.5">Last Push</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {INGESTION_TOKENS.map((tok) => (
                <tr key={tok.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium">{tok.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tok.prefix}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border border-primary/40 text-primary bg-primary/10">
                      {tok.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tok.created}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tok.lastPush}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-muted-foreground hover:text-critical transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <SectionHeader icon={Zap} title="Webhook Configuration" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Config form */}
          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-4">
            <div className="text-sm font-medium">Add Webhook</div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">Events</label>
                <div className="flex flex-wrap gap-1.5">
                  {["incident.created", "incident.escalated", "alert.critical", "alert.high", "asset.changed"].map((ev) => (
                    <label key={ev} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" className="rounded border-border accent-primary" />
                      <span className="font-mono text-muted-foreground">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">Signing Secret</label>
                <input
                  type="password"
                  placeholder="whsec_..."
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <button className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Register Webhook
            </button>
          </div>

          {/* Webhook list */}
          <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Active Webhooks</div>
            </div>
            <div className="divide-y divide-border">
              {WEBHOOKS.map((wh) => (
                <div key={wh.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[280px]">{wh.url}</span>
                    <Switch
                      checked={webhookStatuses[wh.id]}
                      onCheckedChange={(checked) => setWebhookStatuses((p) => ({ ...p, [wh.id]: checked }))}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="size-3" />
                      {wh.events.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className={cn("uppercase", webhookStatuses[wh.id] ? "text-healthy" : "text-muted-foreground")}>
                      {webhookStatuses[wh.id] ? "Active" : "Paused"}
                    </span>
                    <span className="text-muted-foreground">Last: {wh.lastDelivery}</span>
                    <span className={cn(wh.successRate >= 99 ? "text-healthy" : wh.successRate >= 95 ? "text-medium" : "text-critical")}>
                      {wh.successRate}% success
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SDK Examples */}
      <section>
        <SectionHeader icon={Code} title="SDK Examples" />
        <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border px-4 pt-2">
            {(Object.keys(SDK_EXAMPLES) as Array<keyof typeof SDK_EXAMPLES>).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang as "python" | "javascript" | "go")}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono rounded-t transition-colors",
                  activeTab === lang
                    ? "bg-background text-foreground border border-border border-b-transparent -mb-px"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SDK_EXAMPLES[lang].label}
              </button>
            ))}
            <div className="ml-auto pr-1 pb-1">
              <button
                onClick={() => handleCopy(SDK_EXAMPLES[activeTab].code)}
                className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="size-3 text-healthy" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {/* Code block */}
          <div className="bg-background/80 p-4 overflow-x-auto">
            <pre className="text-sm font-mono leading-relaxed text-foreground/90">
              <code>{SDK_EXAMPLES[activeTab].code}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Rate Limits + Token Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Rate Limits */}
        <section>
          <SectionHeader icon={Shield} title="Rate Limits" />
          <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-left px-4 py-2.5">Requests</th>
                  <th className="text-left px-4 py-2.5">Burst</th>
                  <th className="text-left px-4 py-2.5">Ingestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RATE_LIMITS.map((rl) => (
                  <tr key={rl.plan} className={cn(rl.plan === "Enterprise" && "bg-primary/5")}>
                    <td className="px-4 py-3 font-medium">
                      {rl.plan}
                      {rl.plan === "Enterprise" && <span className="ml-2 text-[10px] font-mono uppercase text-primary border border-primary/30 rounded px-1.5 py-0.5">current</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{rl.requests}</td>
                    <td className="px-4 py-3 font-mono text-xs">{rl.burst}</td>
                    <td className="px-4 py-3 font-mono text-xs">{rl.ingestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Token Permissions */}
        <section>
          <SectionHeader icon={Shield} title="Token Permissions" />
          <div className="rounded-lg border border-border bg-surface/60 divide-y divide-border">
            {PERMISSION_SCOPES.map((perm) => (
              <div key={perm.scope} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-mono uppercase rounded px-1.5 py-0.5 border",
                      perm.scope === "admin" && "border-high/40 text-high bg-high/10",
                      perm.scope === "write" && "border-info/40 text-info bg-info/10",
                      perm.scope === "read" && "border-healthy/40 text-healthy bg-healthy/10",
                      perm.scope === "ingest" && "border-primary/40 text-primary bg-primary/10",
                    )}>
                      {perm.scope}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{perm.description}</div>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {perm.default ? "Granted by default" : "Requires admin"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-4 text-primary" />
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}
