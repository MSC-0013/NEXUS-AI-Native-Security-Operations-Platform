import { createFileRoute } from "@tanstack/react-router";
import { Activity, TriangleAlert as AlertTriangle, Cpu, Network, Wifi, Clock, Zap, Layers, Mail, Radio, Gauge } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { MetricCard } from "@/components/metric-card";
import { cn } from "@/lib/utils";
import { usePlatformHealth } from "@/lib/api-hooks";
import type { MetricPoint } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/platform-health")({
  head: () => ({
    meta: [
      { title: "Platform Health — NEXUS" },
      { name: "description", content: "Realtime platform health and infrastructure monitoring." },
    ],
  }),
  component: PlatformHealthPage,
});

/* ── Threshold config ─────────────────────────────────────── */
const THRESHOLDS = [
  { label: "WebSocket msg/s", warn: 8000, crit: 12000 },
  { label: "Indexing p95 (ms)", warn: 200, crit: 500 },
  { label: "Consumer lag", warn: 500, crit: 2000 },
  { label: "Dead letters", warn: 50, crit: 200 },
  { label: "AI queue pending", warn: 500, crit: 1500 },
  { label: "CPU %", warn: 70, crit: 90 },
  { label: "Memory %", warn: 75, crit: 90 },
  { label: "Disk %", warn: 80, crit: 95 },
];

/* ── Sparkline helper ─────────────────────────────────────── */
function Sparkline({ data, color }: { data: MetricPoint[]; color: string }) {
  const id = `ph-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${id})`} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Latency row component ─────────────────────────────────── */
function LatencyRow({ label, p50, p95, p99, series }: {
  label: string; p50: number; p95: number; p99: number; series: MetricPoint[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
        <Clock className="size-3.5 text-info" />
        {label}
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-semibold tabular-nums">{p50}</div>
          <div className="text-[10px] font-mono text-muted-foreground">p50 ms</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums text-high">{p95}</div>
          <div className="text-[10px] font-mono text-muted-foreground">p95 ms</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums text-critical">{p99}</div>
          <div className="text-[10px] font-mono text-muted-foreground">p99 ms</div>
        </div>
      </div>
      <Sparkline data={series} color="oklch(0.72 0.18 50)" />
    </div>
  );
}

/* ── Queue detail panel ────────────────────────────────────── */
function QueuePanel({ title, icon: Icon, items }: {
  title: string; icon: typeof Layers; items: { label: string; value: string | number; tone?: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{it.label}</span>
            <span className={cn("font-semibold tabular-nums", it.tone ?? "text-foreground")}>{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Resource gauge ────────────────────────────────────────── */
function ResourceGauge({ label, value, max = 100, unit, series, color }: {
  label: string; value: number; max?: number; unit: string; series: MetricPoint[]; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const tone = pct > 90 ? "text-critical" : pct > 70 ? "text-high" : "text-healthy";
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{label}</span>
        <span className={cn("text-lg font-semibold tabular-nums", tone)}>{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", tone.replace("text-", "bg-"))} style={{ width: `${pct}%` }} />
      </div>
      <Sparkline data={series} color={color} />
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
function flatSeries(value: number, points = 24): MetricPoint[] {
  return Array.from({ length: points }, (_, i) => ({ t: i, v: value }));
}

function PlatformHealthPage() {
  const { data: health, isLoading } = usePlatformHealth();
  const avgLatency = useMemo(() => {
    const svc = health?.services ?? [];
    if (!svc.length) return 42;
    return Math.round(svc.reduce((sum, x) => sum + (x.latencyMs ?? 0), 0) / svc.length);
  }, [health?.services]);
  const s = useMemo(() => ({
    wsConns: flatSeries(3200),
    wsMsgs: flatSeries(6400),
    wsBw: flatSeries(120),
    idxP50: flatSeries(avgLatency),
    idxP95: flatSeries(avgLatency * 3),
    idxP99: flatSeries(avgLatency * 6),
    consumerLag: flatSeries(320),
    queueDepth: flatSeries(1400),
    deadLetters: flatSeries(18),
    aiPending: flatSeries(420),
    aiProcessing: flatSeries(64),
    aiCompleted: flatSeries(2800),
    aiAvgTime: flatSeries(1200),
    eventRate: flatSeries(8500),
    streamHealth: flatSeries(97),
    bufferUsage: flatSeries(32),
    cpu: flatSeries(58),
    memory: flatSeries(72),
    disk: flatSeries(64),
    network: flatSeries(340),
    uptime: flatSeries(parseFloat(health?.uptime ?? "99") || 99),
    errorRate: flatSeries(2),
  }), [avgLatency, health?.uptime]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Operations / Platform</div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Health</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="size-1.5 rounded-full bg-healthy animate-pulse" />
          {isLoading ? "Loading…" : health?.overall ?? "operational"}
        </div>
      </div>

      {/* Platform status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Uptime", value: "99.97%", tone: "text-healthy" },
          { label: "Error Rate", value: "0.03%", tone: "text-healthy" },
          { label: "Active Alerts", value: 2, tone: "text-high" },
          { label: "Services Up", value: "14 / 14", tone: "text-healthy" },
          { label: "Last Deploy", value: "12m ago", tone: "text-foreground" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-surface/60 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{item.label}</span>
            <span className={cn("text-sm font-semibold tabular-nums", item.tone)}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* WebSocket throughput */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Wifi className="size-3.5 text-info" />
          WebSocket Throughput
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Connections" value="3,218" delta={{ v: "4%", up: true }} icon={Wifi} tone="info" series={s.wsConns} />
          <MetricCard label="Messages/s" value="6,412" delta={{ v: "12%", up: true }} icon={Radio} tone="default" series={s.wsMsgs} />
          <MetricCard label="Bandwidth" value="124 MB/s" delta={{ v: "3%", up: true }} icon={Network} tone="default" series={s.wsBw} />
        </div>
      </div>

      {/* Indexing latency */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Clock className="size-3.5 text-high" />
          Indexing Latency
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LatencyRow label="Event indexing" p50={42} p95={164} p99={338} series={s.idxP95} />
          <LatencyRow label="Search indexing" p50={28} p95={112} p99={276} series={s.idxP99} />
        </div>
      </div>

      {/* Ingestion lag */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Layers className="size-3.5 text-medium" />
          Ingestion Lag
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Consumer Lag" value="324 msgs" delta={{ v: "18%", up: true }} icon={Layers} tone="high" series={s.consumerLag} />
          <MetricCard label="Queue Depth" value="1,412" delta={{ v: "6%", up: true }} icon={Mail} tone="default" series={s.queueDepth} />
          <MetricCard label="Dead Letters" value={18} delta={{ v: "2", up: false }} icon={AlertTriangle} tone="healthy" series={s.deadLetters} />
        </div>
      </div>

      {/* AI processing queue */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Zap className="size-3.5 text-info" />
          AI Processing Queue
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Pending" value={423} icon={Clock} tone="high" series={s.aiPending} />
            <MetricCard label="Processing" value={64} icon={Zap} tone="info" series={s.aiProcessing} />
            <MetricCard label="Completed" value="2,814" icon={Activity} tone="healthy" series={s.aiCompleted} />
            <MetricCard label="Avg Time" value="1.2s" icon={Gauge} tone="default" series={s.aiAvgTime} />
          </div>
          <QueuePanel title="Queue breakdown" icon={Layers} items={[
            { label: "Threat classification", value: 212, tone: "text-high" },
            { label: "Anomaly detection", value: 148, tone: "text-info" },
            { label: "Correlation engine", value: 63, tone: "text-foreground" },
            { label: "Enrichment pipeline", value: 34, tone: "text-healthy" },
          ]} />
        </div>
      </div>

      {/* Realtime processing health */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Activity className="size-3.5 text-healthy" />
          Realtime Processing Health
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Event Rate" value="8,492/s" delta={{ v: "5%", up: true }} icon={Activity} tone="default" series={s.eventRate} />
          <MetricCard label="Stream Health" value="97.2%" delta={{ v: "0.3%", up: false }} icon={Radio} tone="healthy" series={s.streamHealth} />
          <MetricCard label="Buffer Usage" value="32%" delta={{ v: "4%", up: true }} icon={Gauge} tone="info" series={s.bufferUsage} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QueuePanel title="Stream partitions" icon={Radio} items={[
            { label: "Partition 0", value: "2,140/s", tone: "text-healthy" },
            { label: "Partition 1", value: "2,108/s", tone: "text-healthy" },
            { label: "Partition 2", value: "2,244/s", tone: "text-healthy" },
            { label: "Partition 3", value: "2,000/s", tone: "text-info" },
          ]} />
          <QueuePanel title="Consumer groups" icon={Layers} items={[
            { label: "cg-enrichment", value: "0 lag", tone: "text-healthy" },
            { label: "cg-indexing", value: "24 lag", tone: "text-info" },
            { label: "cg-ai-pipeline", value: "312 lag", tone: "text-high" },
            { label: "cg-alerting", value: "0 lag", tone: "text-healthy" },
          ]} />
          <QueuePanel title="Backpressure" icon={Gauge} items={[
            { label: "Ingress rate", value: "8,492/s", tone: "text-foreground" },
            { label: "Egress rate", value: "8,390/s", tone: "text-foreground" },
            { label: "Buffer capacity", value: "32%", tone: "text-healthy" },
            { label: "Shed count", value: 0, tone: "text-healthy" },
          ]} />
        </div>
      </div>

      {/* System resource metrics */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Cpu className="size-3.5 text-primary" />
          System Resources
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ResourceGauge label="CPU" value={58} unit="%" series={s.cpu} color="oklch(0.72 0.16 245)" />
          <ResourceGauge label="Memory" value={72} unit="%" series={s.memory} color="oklch(0.72 0.18 50)" />
          <ResourceGauge label="Disk" value={64} unit="%" series={s.disk} color="oklch(0.82 0.16 95)" />
          <ResourceGauge label="Network" value={340} unit=" MB/s" max={500} series={s.network} color="oklch(0.65 0.2 165)" />
        </div>
      </div>

      {/* Health timeline — sparklines for all key metrics */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <Gauge className="size-3.5 text-primary" />
          Health Timeline (48 min window)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "WebSocket msgs/s", data: s.wsMsgs, color: "oklch(0.72 0.16 245)" },
            { label: "Indexing p95", data: s.idxP95, color: "oklch(0.72 0.18 50)" },
            { label: "Consumer lag", data: s.consumerLag, color: "oklch(0.62 0.23 25)" },
            { label: "AI queue pending", data: s.aiPending, color: "oklch(0.65 0.2 165)" },
            { label: "Event rate", data: s.eventRate, color: "oklch(0.75 0.15 165)" },
            { label: "Stream health", data: s.streamHealth, color: "oklch(0.72 0.19 155)" },
            { label: "CPU", data: s.cpu, color: "oklch(0.72 0.16 245)" },
            { label: "Memory", data: s.memory, color: "oklch(0.72 0.18 50)" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border bg-surface/60 p-3 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{m.label}</div>
              <Sparkline data={m.data} color={m.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Alert thresholds */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="size-3.5 text-high" />
          Alert Thresholds
        </div>
        <div className="rounded-lg border border-border bg-surface/60">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0 px-4 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            <span>Metric</span><span className="text-right w-16">Warn</span><span className="text-right w-16">Crit</span><span className="w-16" />
          </div>
          {THRESHOLDS.map((t) => (
            <div key={t.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2 text-sm border-b border-border last:border-b-0">
              <span>{t.label}</span>
              <span className="text-right w-16 font-mono tabular-nums text-medium">{t.warn.toLocaleString()}</span>
              <span className="text-right w-16 font-mono tabular-nums text-critical">{t.crit.toLocaleString()}</span>
              <div className="w-16 flex justify-end">
                <ThresholdBar warn={t.warn} crit={t.crit} max={t.crit * 1.5} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Small threshold bar ───────────────────────────────────── */
function ThresholdBar({ warn, crit, max }: { warn: number; crit: number; max: number }) {
  const wPct = (warn / max) * 100;
  const cPct = (crit / max) * 100;
  return (
    <div className="h-1.5 w-14 rounded-full bg-surface-2 relative overflow-hidden">
      <div className="absolute top-0 left-0 h-full rounded-full bg-medium/50" style={{ width: `${wPct}%` }} />
      <div className="absolute top-0 left-0 h-full rounded-full bg-critical/50" style={{ width: `${cPct}%` }} />
    </div>
  );
}
