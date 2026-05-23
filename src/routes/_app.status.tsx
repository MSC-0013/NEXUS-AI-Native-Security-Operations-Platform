import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Cpu, Globe, Wifi, Circle as XCircle, Zap, Radio, Server, Database, Search, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { makeMetricSeries } from "@/lib/mock/generators";

export const Route = createFileRoute("/_app/status")({
  head: () => ({
    meta: [
      { title: "System Status — NEXUS" },
      { name: "description", content: "Platform health and service availability." },
    ],
  }),
  component: StatusPage,
});

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

type ServiceStatus = "operational" | "degraded" | "down";

interface Service {
  name: string;
  icon: typeof Activity;
  status: ServiceStatus;
  uptime: string;
  latencyMs: number;
  lastIncident: string;
}

const SERVICES: Service[] = [
  { name: "API Gateway", icon: Server, status: "operational", uptime: "99.99", latencyMs: 12, lastIncident: "23 days ago" },
  { name: "Ingestion Pipeline", icon: Zap, status: "operational", uptime: "99.97", latencyMs: 34, lastIncident: "12 days ago" },
  { name: "AI Engine", icon: Cpu, status: "degraded", uptime: "99.82", latencyMs: 210, lastIncident: "2 hours ago" },
  { name: "Realtime Stream", icon: Radio, status: "operational", uptime: "99.98", latencyMs: 8, lastIncident: "18 days ago" },
  { name: "Search Index", icon: Search, status: "operational", uptime: "99.95", latencyMs: 45, lastIncident: "9 days ago" },
  { name: "Webhook Delivery", icon: Webhook, status: "operational", uptime: "99.96", latencyMs: 68, lastIncident: "5 days ago" },
];

interface Region {
  id: string;
  label: string;
  status: ServiceStatus;
  latencyMs: number;
}

const REGIONS: Region[] = [
  { id: "us-east-1", label: "US East (N. Virginia)", status: "operational", latencyMs: 14 },
  { id: "eu-west-1", label: "EU West (Ireland)", status: "operational", latencyMs: 38 },
  { id: "ap-southeast-1", label: "AP Southeast (Singapore)", status: "degraded", latencyMs: 92 },
];

interface MaintenanceWindow {
  title: string;
  region: string;
  start: string;
  duration: string;
}

const MAINTENANCE: MaintenanceWindow[] = [
  { title: "Search index re-partition", region: "us-east-1", start: "May 28, 02:00 UTC", duration: "45 min" },
  { title: "AI Engine model upgrade (v4.2)", region: "global", start: "Jun 1, 06:00 UTC", duration: "30 min" },
];

interface Incident {
  title: string;
  date: string;
  duration: string;
  status: "resolved" | "monitoring";
}

const INCIDENT_HISTORY: Incident[] = [
  { title: "AI Engine elevated latency", date: "May 23, 2026", duration: "1h 12m", status: "monitoring" },
  { title: "Ingestion Pipeline back-pressure", date: "May 11, 2026", duration: "38m", status: "resolved" },
  { title: "Search Index partial outage", date: "May 9, 2026", duration: "22m", status: "resolved" },
  { title: "Webhook Delivery queue stall", date: "May 4, 2026", duration: "1h 5m", status: "resolved" },
  { title: "API Gateway rate-limit misfire", date: "Apr 28, 2026", duration: "15m", status: "resolved" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-healthy",
  degraded: "bg-high",
  down: "bg-critical",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Major Outage",
};

const STATUS_TEXT: Record<ServiceStatus, string> = {
  operational: "text-healthy",
  degraded: "text-high",
  down: "text-critical",
};

function overallStatus(services: Service[]): ServiceStatus {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function StatusPage() {
  const systemStatus = overallStatus(SERVICES);

  const metricSeries = useMemo(
    () => ({
      uptime: makeMetricSeries(36, 99, 0.04),
      latency: makeMetricSeries(36, 42, 18),
      events: makeMetricSeries(36, 3200, 400),
    }),
    [],
  );

  const overall30d =
    (SERVICES.reduce((sum, s) => sum + parseFloat(s.uptime), 0) / SERVICES.length).toFixed(2);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Platform / Status
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">System Status</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <Clock className="size-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Overall banner */}
      <div
        className={cn(
          "rounded-lg border p-5 flex items-center gap-4",
          systemStatus === "operational"
            ? "border-healthy/30 bg-healthy/5"
            : systemStatus === "degraded"
              ? "border-high/30 bg-high/5"
              : "border-critical/30 bg-critical/5",
        )}
      >
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            systemStatus === "operational"
              ? "bg-healthy/15"
              : systemStatus === "degraded"
                ? "bg-high/15"
                : "bg-critical/15",
          )}
        >
          {systemStatus === "operational" ? (
            <CheckCircle className={cn("size-5", STATUS_TEXT[systemStatus])} />
          ) : systemStatus === "degraded" ? (
            <AlertTriangle className={cn("size-5", STATUS_TEXT[systemStatus])} />
          ) : (
            <XCircle className={cn("size-5", STATUS_TEXT[systemStatus])} />
          )}
        </div>
        <div>
          <div className={cn("text-lg font-semibold", STATUS_TEXT[systemStatus])}>
            {STATUS_LABEL[systemStatus]}
          </div>
          <div className="text-sm text-muted-foreground">
            {systemStatus === "operational"
              ? "All core services are running within normal parameters."
              : systemStatus === "degraded"
                ? "One or more services are experiencing degraded performance."
                : "One or more services are experiencing a major outage."}
          </div>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            30-day uptime
          </div>
          <div className="text-xl font-semibold tabular-nums text-healthy">{overall30d}%</div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard
          label="Uptime (30d)"
          value={`${overall30d}%`}
          delta={{ v: "0.01%", up: false }}
          icon={Activity}
          tone="healthy"
          series={metricSeries.uptime}
        />
        <MetricCard
          label="Avg Latency"
          value="42 ms"
          delta={{ v: "8 ms", up: true }}
          icon={Zap}
          tone="info"
          series={metricSeries.latency}
        />
        <MetricCard
          label="Ingestion Rate"
          value="3.2k/s"
          delta={{ v: "12%", up: true }}
          icon={Database}
          tone="default"
          series={metricSeries.events}
        />
      </div>

      {/* Service cards */}
      <section>
        <h2 className="text-sm font-medium mb-3">Core Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICES.map((svc) => (
            <div
              key={svc.name}
              className="rounded-lg border border-border bg-surface/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svc.icon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.name}</span>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider",
                    STATUS_TEXT[svc.status],
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full animate-pulse",
                      STATUS_DOT[svc.status],
                    )}
                  />
                  {STATUS_LABEL[svc.status]}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    Uptime
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{svc.uptime}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    Latency
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{svc.latencyMs} ms</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    Last incident
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground">{svc.lastIncident}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Infrastructure panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* WebSocket health */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wifi className="size-4 text-primary" />
            WebSocket Health
          </div>
          <div className="space-y-2">
            {[
              { label: "Connections", value: "1,847" },
              { label: "Messages/s", value: "4.2k" },
              { label: "Avg latency", value: "6 ms" },
              { label: "Drop rate", value: "0.02%" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ingestion health */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Database className="size-4 text-primary" />
            Ingestion Health
          </div>
          <div className="space-y-2">
            {[
              { label: "Events/s", value: "3,247" },
              { label: "Consumer lag", value: "120 ms" },
              { label: "Queue depth", value: "8,412" },
              { label: "Dead letters (24h)", value: "14" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI engine status */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="size-4 text-high" />
            AI Engine Status
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-high">
              <span className="size-2 rounded-full bg-high animate-pulse" />
              degraded
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Model v4.1", value: "Available" },
              { label: "Model v4.2-rc", value: "Loading" },
              { label: "Processing queue", value: "382" },
              { label: "Avg response time", value: "210 ms" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional health + Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Regional health */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe className="size-4 text-primary" />
            Regional Health
          </div>
          <div className="divide-y divide-border">
            {REGIONS.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2.5 rounded-full", STATUS_DOT[r.status])}
                  />
                  <span className="text-sm">{r.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                    {r.latencyMs} ms
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-mono uppercase tracking-wider",
                      STATUS_TEXT[r.status],
                    )}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled maintenance */}
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-primary" />
            Scheduled Maintenance
          </div>
          {MAINTENANCE.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No upcoming maintenance windows.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {MAINTENANCE.map((m) => (
                <div key={m.start} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.title}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {m.duration}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {m.region} &middot; {m.start}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident history */}
      <section className="rounded-lg border border-border bg-surface/60 p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-4">
          <AlertTriangle className="size-4 text-high" />
          Incident History
        </div>
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          {INCIDENT_HISTORY.map((inc, i) => (
            <div key={i} className="relative pb-5 last:pb-0">
              <div
                className={cn(
                  "absolute left-[-17px] top-1.5 size-3.5 rounded-full border-2 border-surface",
                  inc.status === "resolved" ? "bg-healthy" : "bg-high",
                )}
              />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{inc.title}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {inc.date} &middot; Duration: {inc.duration}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider",
                    inc.status === "resolved" ? "text-healthy" : "text-high",
                  )}
                >
                  {inc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
