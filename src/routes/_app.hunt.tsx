import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { useEvents, useThreatIocs, useHuntQueries, useHuntAnomalies, useHuntResults } from "@/lib/api-hooks";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, Search, Target, TrendingUp, Zap, ListFilter as Filter, Clock, Globe, Bug, Play, Save, RotateCcw, ChevronRight, TriangleAlert as AlertTriangle, ChartBar as BarChart3, ArrowRightLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/hunt")({
  head: () => ({ meta: [{ title: "Threat Hunting — NEXUS" }] }),
  component: HuntPage,

});

function HuntPage() {
  const { data: eventsData } = useEvents({ limit: 50 });
  const { data: iocsData } = useThreatIocs();
  const { data: queriesData, isLoading: queriesLoading } = useHuntQueries();
  const { data: anomaliesData, isLoading: anomaliesLoading } = useHuntAnomalies();
  
  const events = eventsData?.items ?? [];
  const iocItems = iocsData?.items ?? [];
  const queries = queriesData?.items ?? [];
  const anomalies = anomaliesData?.items ?? [];
  const criticalEvents = events.filter((e) => e.severity === "critical" || e.severity === "high");

  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [iocSearch, setIocSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const activeQuery = queries.find((q) => q.id === selectedQuery);
  const filteredIocs = iocSearch
    ? iocItems.filter((i) => i.value.toLowerCase().includes(iocSearch.toLowerCase()))
    : iocItems;

  const handleRunQuery = async () => {
    setShowResults(true);
    // In a real scenario, you'd fetch results from the API
    // For now, just show a placeholder
    setResults([
      { time: "14:23:01", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.4MB", proto: "DNS" },
      { time: "14:23:31", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.1MB", proto: "DNS" },
      { time: "14:24:01", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.3MB", proto: "DNS" },
    ]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Crosshair className="h-5 w-5 text-primary" />Threat Hunting</h1>
          <p className="text-xs text-muted-foreground mt-1">Proactive threat detection and IOC exploration</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-healthy animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">{queriesLoading ? "…" : queries.length} saved queries</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Active Hunts" value={String(queries.length)} icon={Crosshair} tone="default" />
        <MetricCard label="Event hits" value={String(events.length)} icon={Zap} tone="high" />
        <MetricCard label="High/Critical" value={String(criticalEvents.length)} icon={AlertTriangle} tone="critical" />
        <MetricCard label="IOCs Tracked" value={String(iocItems.length)} icon={Bug} tone="default" />
        <MetricCard label="Coverage" value={iocItems.length > 0 ? "Live" : "—"} icon={Target} tone="healthy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
        {/* Query Editor */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Query Editor</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={handleRunQuery} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                  <Play className="h-3 w-3" />Run
                </button>
                <button className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-surface hover:bg-surface-2 text-muted-foreground transition-colors">
                  <Save className="h-3 w-3" />Save
                </button>
              </div>
            </div>
            <textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full h-32 bg-background text-foreground font-mono text-sm p-4 resize-none outline-none"
              placeholder="event_type:network WHERE src_ip = '...' AND bytes > 100MB"
              spellCheck={false}
            />
          </div>

          {/* Saved Queries */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Saved Hunting Queries</span>
            </div>
            <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
              {queriesLoading && <div className="px-4 py-4 text-xs text-muted-foreground">Loading queries…</div>}
              {!queriesLoading && queries.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No saved queries.</div>}
              {queries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setSelectedQuery(q.id); setQueryText(q.query); }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left hover:bg-surface transition-colors",
                    selectedQuery === q.id && "bg-primary/5 border-l-2 border-l-primary",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={q.severity as any} />
                    <span className="text-sm font-medium">{q.name}</span>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">{q.frequency}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                    <span>{q.hits} hits</span>
                    <span>Last: {formatDistanceToNow(new Date(q.lastRun), { addSuffix: true })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* IOC Search */}
          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">IOC Hunt</span>
            </div>
            <div className="flex gap-2">
              <input
                value={iocSearch}
                onChange={(e) => setIocSearch(e.target.value)}
                placeholder="Search IP, domain, hash, email..."
                className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm font-mono outline-none focus:border-primary"
              />
              <button className="px-3 py-1.5 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30 transition-colors">
                <Target className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 space-y-1.5">
              {filteredIocs.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">No IOCs match.</p>
              )}
              {filteredIocs.slice(0, 12).map((ioc) => (
                <div key={ioc.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface transition-colors">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase", ioc.type === "IP" ? "text-critical border-critical/30 bg-critical/10" : ioc.type === "hash" ? "text-high border-high/30 bg-high/10" : ioc.type === "domain" ? "text-info border-info/30 bg-info/10" : "text-medium border-medium/30 bg-medium/10")}>
                    {ioc.type}
                  </span>
                  <span className="text-xs font-mono truncate flex-1">{ioc.value}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{Math.round(ioc.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results + Pivots + Anomalies */}
        <div className="space-y-4">
          {/* Query Results */}
          {showResults && (
            <div className="rounded-lg border border-primary/30 bg-surface/60">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Query Results</span>
                <span className="ml-auto text-[10px] font-mono text-primary">{results.length} matches</span>
              </div>
              <div className="p-4 space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded bg-background text-xs font-mono">
                    <span className="text-muted-foreground">{r.time}</span>
                    <span>{r.src}</span>
                    <ArrowRightLeft className="h-3 w-3 text-primary" />
                    <span className="text-critical">{r.dst}</span>
                    <span className="ml-auto text-muted-foreground">{r.bytes} {r.proto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalies */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Anomaly Detection</span>
            </div>
            <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
              {anomaliesLoading && <div className="px-4 py-4 text-xs text-muted-foreground">Loading anomalies…</div>}
              {!anomaliesLoading && anomalies.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No anomalies detected.</div>}
              {anomalies.map((a) => (
                <div key={a.id} className="px-4 py-2.5 hover:bg-surface transition-colors">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity as any} />
                    <span className="text-sm font-medium">{a.type}</span>
                    <span className="ml-auto text-[9px] font-mono text-muted-foreground">
                      {(a.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-mono">
                    <span className="text-muted-foreground">Baseline: {a.baseline}</span>
                    <span className="text-critical">Observed: {a.observed}</span>
                    <span className="text-high">+{a.deviation}% deviation</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pivots */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Attack Pivots</span>
            </div>
            <div className="divide-y divide-border">
              {PIVOTS.map((p) => (
                <button key={p.id} className="w-full px-4 py-2.5 text-left hover:bg-surface transition-colors">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-foreground">{p.from}</span>
                    <ChevronRight className="h-3 w-3 text-primary" />
                    <span className="font-mono text-primary">{p.to}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{p.description}</span>
                    <span className="ml-auto font-mono">{p.entityCount} entities</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
