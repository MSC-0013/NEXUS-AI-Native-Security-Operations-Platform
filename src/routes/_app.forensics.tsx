import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { useEndpoints, useForensics } from "@/lib/api-hooks";
import { FileSearch, File, Cpu, Bug, Clock, MemoryStick, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/forensics")({
  head: () => ({ meta: [{ title: "Forensics — NEXUS" }] }),
  component: ForensicsPage,

});

function ForensicsPage() {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [expandedProc, setExpandedProc] = useState<number | null>(null);
  
  const { data: endpointsData, isLoading: endpointsLoading } = useEndpoints();
  const { data: forensicsData, isLoading: forensicsLoading } = useForensics(selectedEndpointId || undefined);
  
  const endpoints = endpointsData?.items ?? [];
  const focusEndpoint = useMemo(
    () => {
      if (selectedEndpointId) {
        return endpoints.find((e) => e.id === selectedEndpointId) ?? null;
      }
      return [...endpoints].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null;
    },
    [endpoints, selectedEndpointId],
  );

  // Update selected endpoint when focus endpoint changes
  useMemo(() => {
    if (focusEndpoint && !selectedEndpointId) {
      setSelectedEndpointId(focusEndpoint.id);
    }
  }, [focusEndpoint, selectedEndpointId]);

  const fileEvents = forensicsData?.fileEvents ?? [];
  const processes = forensicsData?.processTree ?? [];
  const binaries = forensicsData?.binaries ?? [];
  const artifacts = forensicsData?.artifacts ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" />Forensics Workbench</h1>
        <select
          value={selectedEndpointId || ""}
          onChange={(e) => setSelectedEndpointId(e.target.value || null)}
          className="bg-surface border border-border rounded px-3 py-1 text-xs font-mono"
        >
          {endpointsLoading && <option>Loading endpoints…</option>}
          {!endpointsLoading && endpoints.length === 0 && <option>No endpoints</option>}
          {endpoints.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.hostname} — risk {ep.riskScore}
            </option>
          ))}
        </select>
      </div>
      {focusEndpoint && (
        <div className="rounded-lg border border-border bg-surface/60 px-4 py-2 text-xs font-mono text-muted-foreground">
          Focus: <span className="text-foreground">{focusEndpoint.hostname}</span> ({focusEndpoint.os}) · risk {focusEndpoint.riskScore} · {focusEndpoint.status}
        </div>
      )}

      {!focusEndpoint && !forensicsLoading && (
        <div className="rounded-lg border border-border bg-surface/60 px-4 py-4 text-xs text-muted-foreground">
          Select an endpoint to view forensics data.
        </div>
      )}

      {forensicsLoading && (
        <div className="rounded-lg border border-border bg-surface/60 px-4 py-4 text-xs text-muted-foreground">
          Loading forensics data…
        </div>
      )}

      {!forensicsLoading && focusEndpoint && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Timeline */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <File className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">File System Timeline</span>
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {fileEvents.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No file events recorded.</div>}
              {fileEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-surface transition-colors text-xs font-mono">
                  <span className="text-muted-foreground w-16">{e.time}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", e.action === "create" ? "bg-critical/10 text-critical" : e.action === "delete" ? "bg-high/10 text-high" : e.action === "modify" ? "bg-medium/10 text-medium" : "bg-info/10 text-info")}>
                    {e.action.toUpperCase()}
                  </span>
                  <span className="truncate flex-1 text-foreground">{e.path}</span>
                  <span className="text-muted-foreground">{e.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Process Tree */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Process Tree</span>
            </div>
            <div className="p-3 space-y-0.5">
              {processes.length === 0 && <div className="px-2 py-4 text-xs text-muted-foreground">No processes recorded.</div>}
              {processes.map((p) => (
                <div key={p.pid}>
                  <button
                    onClick={() => setExpandedProc(expandedProc === p.pid ? null : p.pid)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-surface transition-colors",
                      p.severity === "critical" && "border-l-2 border-l-critical",
                      p.severity === "high" && "border-l-2 border-l-high",
                    )}
                  >
                    {expandedProc === p.pid ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-mono text-xs text-muted-foreground w-10">{p.pid}</span>
                    <span className="text-xs font-medium">{p.name}</span>
                    <SeverityBadge severity={p.severity as any} />
                    <span className="ml-auto text-[9px] font-mono text-muted-foreground">{p.user}</span>
                  </button>
                  {expandedProc === p.pid && (
                    <div className="ml-10 px-2 py-1 text-[10px] font-mono text-muted-foreground bg-background rounded mt-0.5 mb-1">
                      {p.cmdline}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suspicious Binaries */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <Bug className="h-4 w-4 text-critical" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Suspicious Binaries</span>
            </div>
            <div className="divide-y divide-border">
              {binaries.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No suspicious binaries detected.</div>}
              {binaries.map((b) => (
                <div key={b.hash} className="px-4 py-3 hover:bg-surface transition-colors">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={b.severity as any} />
                    <span className="text-sm font-medium">{b.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border">{b.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{b.detection}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                    <span>SHA256: {b.hash.slice(0, 16)}...</span>
                    <span className={cn(b.score > 90 ? "text-critical" : b.score > 70 ? "text-high" : "text-medium")}>Threat: {b.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Artifacts */}
          <div className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Memory Artifacts</span>
            </div>
            <div className="divide-y divide-border">
              {artifacts.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No artifacts recorded.</div>}
              {artifacts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface transition-colors">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">{a.type}</span>
                  <span className="text-xs font-mono flex-1">{a.detail}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">PID {a.pid}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
