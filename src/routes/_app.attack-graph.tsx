import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  Cloud, Database, GitBranch, Globe, KeyRound, Lock, Network, Server,
  ShieldAlert, Skull, Target, Workflow, Zap, Crosshair, Link2, Siren,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { Switch } from "@/components/ui/switch";
import { useAttackGraphs } from "@/lib/api-hooks";

export const Route = createFileRoute("/_app/attack-graph")({
  head: () => ({ meta: [{ title: "Attack Graph — NEXUS" }] }),
  component: AttackGraphPage,
});

type NodeKind = "internet" | "identity" | "endpoint" | "service" | "cloud" | "data" | "secret";
interface GNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  risk: number;
  crownJewel?: boolean;
}
interface GEdge { from: string; to: string; technique: string; lateral?: boolean; }
interface DepEdge { from: string; to: string; label: string; }

const ICONS: Record<NodeKind, LucideIcon> = {
  internet: Globe,
  identity: KeyRound,
  endpoint: Server,
  service: Network,
  cloud: Cloud,
  data: Database,
  secret: Lock,
};

const NODES: GNode[] = [
  { id: "inet", label: "Internet", kind: "internet", x: 80, y: 220, risk: 0 },
  { id: "web", label: "web-prod-12", kind: "service", x: 240, y: 120, risk: 72 },
  { id: "phish", label: "finance-laptop-08", kind: "endpoint", x: 240, y: 320, risk: 64 },
  { id: "okta", label: "k.morgan @ Okta", kind: "identity", x: 420, y: 80, risk: 81 },
  { id: "build", label: "build-runner-44", kind: "endpoint", x: 420, y: 220, risk: 88 },
  { id: "vpn", label: "vpn-gateway", kind: "service", x: 420, y: 360, risk: 41 },
  { id: "aws", label: "aws-prod root", kind: "cloud", x: 620, y: 80, risk: 96, crownJewel: true },
  { id: "vault", label: "secrets-vault", kind: "secret", x: 620, y: 220, risk: 92, crownJewel: true },
  { id: "rds", label: "rds-prod-payments", kind: "data", x: 820, y: 120, risk: 99, crownJewel: true },
  { id: "kms", label: "kms-master-key", kind: "secret", x: 820, y: 280, risk: 86, crownJewel: true },
  { id: "cust", label: "customer-db", kind: "data", x: 820, y: 420, risk: 78, crownJewel: true },
];

const EDGES: GEdge[] = [
  { from: "inet", to: "web", technique: "T1190 Exploit Public-Facing App" },
  { from: "inet", to: "phish", technique: "T1566 Phishing" },
  { from: "web", to: "build", technique: "RCE → lateral", lateral: true },
  { from: "phish", to: "okta", technique: "MFA fatigue" },
  { from: "phish", to: "vpn", technique: "Stolen session" },
  { from: "okta", to: "aws", technique: "T1078 Valid Accounts" },
  { from: "build", to: "vault", technique: "Token leak", lateral: true },
  { from: "build", to: "aws", technique: "OIDC trust abuse", lateral: true },
  { from: "vpn", to: "vault", technique: "Privilege esc" },
  { from: "vault", to: "kms", technique: "Cred chain" },
  { from: "aws", to: "rds", technique: "IAM passthrough" },
  { from: "vault", to: "rds", technique: "Static creds" },
  { from: "vpn", to: "cust", technique: "SQL admin" },
  { from: "kms", to: "cust", technique: "Decrypt PII" },
];

const DEP_EDGES: DepEdge[] = [
  { from: "web", to: "okta", label: "auth provider" },
  { from: "okta", to: "aws", label: "identity federation" },
  { from: "aws", to: "rds", label: "data storage" },
  { from: "aws", to: "vault", label: "secret management" },
  { from: "vault", to: "kms", label: "encryption key" },
  { from: "vpn", to: "okta", label: "auth gateway" },
  { from: "web", to: "build", label: "CI/CD trigger" },
  { from: "rds", to: "kms", label: "encryption at rest" },
];

const PATHS = [
  { entry: "Internet → web-prod-12", chain: "RCE → cred dump", target: "rds-prod-payments", hops: 4, score: 98, sev: "critical" as const, nodes: ["inet","web","build","vault","rds"] },
  { entry: "Phish → finance-laptop-08", chain: "MFA fatigue → Okta admin", target: "aws-prod root", hops: 5, score: 95, sev: "critical" as const, nodes: ["inet","phish","okta","aws"] },
  { entry: "Supply chain → build-runner-44", chain: "Token leak → vault", target: "rds-prod-payments", hops: 3, score: 92, sev: "critical" as const, nodes: ["build","vault","rds"] },
  { entry: "VPN → k.morgan session", chain: "Privilege esc → vault token", target: "secrets vault", hops: 4, score: 88, sev: "high" as const, nodes: ["phish","vpn","vault","kms"] },
  { entry: "Public S3 → leaked SAS key", chain: "Lateral → SQL admin", target: "customer-db", hops: 3, score: 84, sev: "high" as const, nodes: ["vpn","cust","kms"] },
];

const COMPROMISED_THRESHOLD = 80;

/* ------------------------------------------------------------------ */
/*  Blast radius: BFS from a source node following attack edges        */
/* ------------------------------------------------------------------ */
function computeBlastRadius(sourceId: string): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of EDGES) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  const visited = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nxt of adj.get(cur) ?? []) {
      if (!visited.has(nxt)) queue.push(nxt);
    }
  }
  return visited;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
function AttackGraphPage() {
  const { data: graphsData, isLoading } = useAttackGraphs();
  const graphCount = graphsData?.items?.length ?? 0;
  const primaryGraph = graphsData?.items?.[0];
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState<number | null>(0);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [showDeps, setShowDeps] = useState(false);
  const [blastNode, setBlastNode] = useState<string | null>(null);

  const highlighted = useMemo(() => {
    if (blastNode) return computeBlastRadius(blastNode);
    if (active === null) return new Set<string>();
    return new Set(PATHS[active].nodes);
  }, [active, blastNode]);

  const blastReachable = useMemo(() => {
    if (!blastNode) return new Set<string>();
    return computeBlastRadius(blastNode);
  }, [blastNode]);

  const nodeById = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);

  const isEdgeOnPath = useCallback(
    (from: string, to: string) => highlighted.has(from) && highlighted.has(to),
    [highlighted],
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      setBlastNode((prev) => (prev === id ? null : id));
    },
    [],
  );

  const compromisedNodes = useMemo(
    () => NODES.filter((n) => n.risk >= COMPROMISED_THRESHOLD),
    [],
  );

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ---- inline keyframes ---- */}
      <style>{`
        @keyframes edgeFlowDot {
          0%   { offset-distance: 0%;   opacity: 1; }
          90%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { r: 26; opacity: 0.35; }
          50%      { r: 34; opacity: 0.12; }
        }
        @keyframes lateralDash {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -24; }
        }
        .edge-dot          { animation: edgeFlowDot 2.4s linear infinite; }
        .compromised-glow  { animation: pulseGlow 2s ease-in-out infinite; }
        .lateral-edge      { animation: lateralDash 1.2s linear infinite; }
      `}</style>

      {/* ---- header ---- */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          <GitBranch className="size-3.5" /> Investigate
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Attack Graph{primaryGraph?.name ? `: ${primaryGraph.name}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "Loading graphs…" : `${graphCount} graph(s) from API`}
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl mt-1">
              Interactive blast-radius graph mapping identities, assets, and vulnerabilities into exploitable attack paths. Click a node to trace blast radius, hover for exposure detail.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* blast mode indicator */}
            {blastNode && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-critical">
                <Crosshair className="size-3" />
                blast: {nodeById.get(blastNode)?.label}
                <button
                  onClick={() => setBlastNode(null)}
                  className="ml-1 underline underline-offset-2 hover:text-foreground"
                >
                  clear
                </button>
              </span>
            )}
            {/* zoom controls */}
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface/60 p-1">
              <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} className="px-2 py-1 text-xs hover:bg-surface-2 rounded">−</button>
              <span className="px-2 text-[11px] font-mono tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} className="px-2 py-1 text-xs hover:bg-surface-2 rounded">+</button>
              <button onClick={() => setZoom(1)} className="ml-1 px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-muted-foreground hover:text-foreground">reset</button>
            </div>
          </div>
        </div>
      </header>

      {/* ---- metric cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Graph nodes" value="184,210" icon={Network} tone="info" />
        <MetricCard label="Edges" value="1.4M" icon={Workflow} />
        <MetricCard label="Attack paths" value={2812} icon={GitBranch} tone="high" />
        <MetricCard label="To crown jewels" value={41} icon={Target} tone="critical" delta={{ v: "5", up: true }} />
        <MetricCard label="Compromised" value={compromisedNodes.length} icon={Siren} tone="critical" />
      </div>

      {/* ---- graph + sidebar ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <section className="rounded-lg border border-border bg-surface/40 overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Skull className="size-3.5 text-critical" />
              <h3 className="text-sm font-medium">Live kill-chain topology</h3>
            </div>
            <div className="flex items-center gap-4">
              {/* dependency toggle */}
              <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground cursor-pointer">
                <Link2 className="size-3" />
                Dependencies
                <Switch checked={showDeps} onCheckedChange={setShowDeps} className="scale-75" />
              </label>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {blastNode ? `blast radius` : active !== null ? `path #${active + 1} selected` : "all paths"}
              </span>
            </div>
          </header>

          <div className="relative bg-[radial-gradient(circle_at_center,oklch(from_var(--surface)_l_c_h/0.4)_0%,transparent_70%)]">
            <svg
              viewBox="0 0 900 480"
              className="w-full h-[480px]"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
                </marker>
                <marker id="arrow-info" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-info" />
                </marker>
                {/* blast radius gradient for reachable nodes */}
                <radialGradient id="blast-grad">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 25)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="oklch(0.65 0.2 25)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* ---- dependency edges (below attack edges) ---- */}
              {showDeps && DEP_EDGES.map((d, i) => {
                const a = nodeById.get(d.from)!;
                const b = nodeById.get(d.to)!;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - 14;
                return (
                  <g key={`dep-${i}`} className="opacity-60">
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="oklch(0.7 0.12 200)"
                      strokeWidth={1}
                      strokeDasharray="6 3"
                      markerEnd="url(#arrow-info)"
                    />
                    <text x={mx} y={my} textAnchor="middle" className="fill-info text-[8px] font-mono opacity-70">
                      {d.label}
                    </text>
                  </g>
                );
              })}

              {/* ---- attack edges ---- */}
              {EDGES.map((e, i) => {
                const a = nodeById.get(e.from)!;
                const b = nodeById.get(e.to)!;
                const onPath = isEdgeOnPath(a.id, b.id);
                const isLateral = !!e.lateral;
                return (
                  <g key={i}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      className={cn(
                        "transition-all",
                        onPath ? "stroke-critical" : "stroke-border",
                        isLateral && onPath && "lateral-edge",
                      )}
                      strokeWidth={onPath ? 2.5 : 1}
                      strokeDasharray={isLateral ? (onPath ? "8 4" : "6 3") : (onPath ? "none" : "4 4")}
                      markerEnd="url(#arrow)"
                      opacity={active !== null && !onPath && !blastNode ? 0.25 : 1}
                    />
                    {/* flowing dot on highlighted edges */}
                    {onPath && (
                      <circle r={2.5} className="fill-critical edge-dot">
                        <animateMotion
                          dur="2.4s"
                          repeatCount="indefinite"
                          path={`M${a.x},${a.y} L${b.x},${b.y}`}
                        />
                      </circle>
                    )}
                    {/* second dot offset for visual density on longer paths */}
                    {onPath && (
                      <circle r={2} className="fill-critical/50 edge-dot" style={{ animationDelay: "1.2s" }}>
                        <animateMotion
                          dur="2.4s"
                          repeatCount="indefinite"
                          path={`M${a.x},${a.y} L${b.x},${b.y}`}
                          begin="1.2s"
                        />
                      </circle>
                    )}
                    {/* lateral movement label */}
                    {isLateral && onPath && (
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 8}
                        textAnchor="middle"
                        className="fill-critical/70 text-[8px] font-mono uppercase tracking-wider"
                      >
                        lateral
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ---- blast radius highlight arcs (behind nodes) ---- */}
              {blastNode && blastReachable.size > 1 && (() => {
                const src = nodeById.get(blastNode)!;
                return (
                  <circle
                    cx={src.x}
                    cy={src.y}
                    r={60}
                    fill="url(#blast-grad)"
                    className="pointer-events-none"
                  />
                );
              })()}

              {/* ---- nodes ---- */}
              {NODES.map((n) => {
                const Icon = ICONS[n.kind];
                const isHi = highlighted.has(n.id);
                const isHover = hoverNode === n.id;
                const isCompromised = n.risk >= COMPROMISED_THRESHOLD;
                const isBlastSource = blastNode === n.id;
                const isBlastReach = blastNode != null && blastReachable.has(n.id);
                const r = n.crownJewel ? 22 : 18;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    onMouseEnter={() => setHoverNode(n.id)}
                    onMouseLeave={() => setHoverNode(null)}
                    onClick={() => handleNodeClick(n.id)}
                    className="cursor-pointer"
                  >
                    {/* compromised pulsing glow */}
                    {isCompromised && (
                      <circle
                        r={r + 8}
                        className="fill-none stroke-critical/40 compromised-glow"
                        strokeWidth={2}
                      />
                    )}
                    {/* crown jewel ring */}
                    {n.crownJewel && (
                      <circle r={r + 6} className="fill-none stroke-critical/40" strokeWidth={1} strokeDasharray="2 3">
                        <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="3s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* blast radius target ring */}
                    {isBlastReach && !isBlastSource && (
                      <circle
                        r={r + 10}
                        className="fill-none stroke-critical/25"
                        strokeWidth={1.5}
                        strokeDasharray="3 4"
                      >
                        <animate attributeName="r" values={`${r + 8};${r + 14};${r + 8}`} dur="2.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* main node circle */}
                    <circle
                      r={r}
                      className={cn(
                        "transition-all",
                        isBlastSource ? "fill-critical/20 stroke-critical" :
                        n.crownJewel ? "fill-critical/15 stroke-critical" :
                        isCompromised ? "fill-high/15 stroke-high" :
                        n.risk > 70 ? "fill-high/15 stroke-high" :
                        n.risk > 40 ? "fill-medium/15 stroke-medium" :
                        "fill-surface stroke-border",
                      )}
                      strokeWidth={isHi || isHover || isBlastSource ? 2.5 : 1.2}
                      opacity={active !== null && !isHi && !blastNode ? 0.4 : 1}
                    />
                    {/* icon */}
                    <foreignObject x={-9} y={-9} width={18} height={18} className="pointer-events-none">
                      <div className="flex h-full w-full items-center justify-center text-foreground">
                        <Icon className="size-4" />
                      </div>
                    </foreignObject>
                    {/* label */}
                    <text y={r + 14} textAnchor="middle" className="fill-foreground text-[10px] font-mono">
                      {n.label}
                    </text>
                    {/* compromised badge */}
                    {isCompromised && (
                      <g transform={`translate(${r - 4},${-r + 4})`}>
                        <circle r={5} className="fill-critical" />
                        <text textAnchor="middle" y={3.5} className="fill-white text-[7px] font-bold">!</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ---- hover tooltip ---- */}
            {hoverNode && (() => {
              const n = nodeById.get(hoverNode)!;
              return (
                <div
                  className="absolute z-10 pointer-events-none rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg"
                  style={{ left: `${(n.x / 900) * 100}%`, top: `${(n.y / 480) * 100}%`, transform: "translate(-50%, -120%)" }}
                >
                  <div className="font-medium">{n.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">{n.kind} &middot; risk {n.risk}</div>
                  {n.crownJewel && <div className="text-[10px] text-critical mt-1 font-mono">CROWN JEWEL</div>}
                  {n.risk >= COMPROMISED_THRESHOLD && <div className="text-[10px] text-high mt-0.5 font-mono">COMPROMISED</div>}
                  {blastNode && blastReachable.has(n.id) && (
                    <div className="text-[10px] text-critical/80 mt-0.5 font-mono">
                      reachable from {nodeById.get(blastNode)?.label} &middot; {blastReachable.size - 1} hops max
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ---- footer legend ---- */}
          <footer className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <LegendDot className="bg-critical" label="Crown jewel" />
            <LegendDot className="bg-high" label="Compromised" />
            <LegendDot className="bg-medium" label="Medium" />
            <LegendDot className="bg-border" label="Asset" />
            <LegendDot className="bg-info" label="Dependency" />
            <span className="ml-auto">click node → blast radius &middot; toggle → deps</span>
          </footer>
        </section>

        {/* ---- sidebar ---- */}
        <aside className="space-y-3">
          {/* attack paths panel */}
          <section className="rounded-lg border border-border bg-surface/60">
            <header className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-medium flex items-center gap-2"><Zap className="size-3.5 text-high" /> Attack paths</h3>
            </header>
            <ul className="divide-y divide-border max-h-[240px] overflow-y-auto">
              {PATHS.map((p, i) => (
                <li
                  key={i}
                  onClick={() => { setActive(active === i ? null : i); setBlastNode(null); }}
                  className={cn(
                    "cursor-pointer px-4 py-2.5 text-xs space-y-0.5 transition-colors",
                    active === i ? "bg-surface-2" : "hover:bg-surface-2/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{p.entry}</span>
                    <span className={cn("font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded border",
                      p.sev === "critical" ? "border-critical/40 text-critical bg-critical/10" : "border-high/40 text-high bg-high/10")}>
                      {p.score}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{p.chain}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">→ {p.target} &middot; {p.hops} hops</div>
                </li>
              ))}
            </ul>
          </section>

          {/* crown jewels panel */}
          <section className="rounded-lg border border-border bg-surface/60">
            <header className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-medium flex items-center gap-2"><Target className="size-3.5 text-critical" /> Crown jewels</h3>
            </header>
            <ul className="divide-y divide-border">
              {NODES.filter((n) => n.crownJewel).map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNodeClick(n.id)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-xs cursor-pointer hover:bg-surface-2/50 transition-colors",
                    blastNode === n.id && "bg-critical/10",
                  )}
                >
                  <span className="font-mono">{n.label}</span>
                  <span className="text-[10px] font-mono text-critical">{n.risk} risk</span>
                </li>
              ))}
            </ul>
          </section>

          {/* compromised nodes panel */}
          <section className="rounded-lg border border-border bg-surface/60">
            <header className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-medium flex items-center gap-2"><Siren className="size-3.5 text-high" /> Compromised</h3>
            </header>
            <ul className="divide-y divide-border">
              {compromisedNodes.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNodeClick(n.id)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-xs cursor-pointer hover:bg-surface-2/50 transition-colors",
                    blastNode === n.id && "bg-critical/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-high animate-pulse" />
                    <span className="font-mono">{n.label}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono",
                    n.risk >= 90 ? "text-critical" : "text-high",
                  )}>{n.risk} risk</span>
                </li>
              ))}
            </ul>
          </section>

          {/* blast radius summary */}
          {blastNode && (
            <section className="rounded-lg border border-critical/30 bg-critical/5">
              <header className="border-b border-critical/20 px-4 py-2.5">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Crosshair className="size-3.5 text-critical" /> Blast radius
                </h3>
              </header>
              <div className="px-4 py-3 text-xs space-y-1.5">
                <div className="font-mono text-muted-foreground">
                  Source: <span className="text-foreground">{nodeById.get(blastNode)?.label}</span>
                </div>
                <div className="font-mono text-muted-foreground">
                  Reachable: <span className="text-critical">{blastReachable.size}</span> node{blastReachable.size !== 1 && "s"}
                </div>
                <div className="font-mono text-muted-foreground">
                  Crown jewels at risk:{" "}
                  <span className="text-critical">
                    {[...blastReachable].filter((id) => nodeById.get(id)?.crownJewel).length}
                  </span>
                </div>
                <div className="font-mono text-muted-foreground">
                  Max risk:{" "}
                  <span className="text-critical">
                    {Math.max(...[...blastReachable].map((id) => nodeById.get(id)?.risk ?? 0))}
                  </span>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend dot helper                                                   */
/* ------------------------------------------------------------------ */
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} /> {label}
    </span>
  );
}
