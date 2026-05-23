import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Cloud, Database, GitBranch, Globe, KeyRound, Lock, Network, Server,
  ShieldAlert, Skull, Target, Workflow, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";

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
  risk: number; // 0-100
  crownJewel?: boolean;
}
interface GEdge { from: string; to: string; technique: string; }

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
  { from: "web", to: "build", technique: "RCE → lateral" },
  { from: "phish", to: "okta", technique: "MFA fatigue" },
  { from: "phish", to: "vpn", technique: "Stolen session" },
  { from: "okta", to: "aws", technique: "T1078 Valid Accounts" },
  { from: "build", to: "vault", technique: "Token leak" },
  { from: "build", to: "aws", technique: "OIDC trust abuse" },
  { from: "vpn", to: "vault", technique: "Privilege esc" },
  { from: "vault", to: "kms", technique: "Cred chain" },
  { from: "aws", to: "rds", technique: "IAM passthrough" },
  { from: "vault", to: "rds", technique: "Static creds" },
  { from: "vpn", to: "cust", technique: "SQL admin" },
  { from: "kms", to: "cust", technique: "Decrypt PII" },
];

const PATHS = [
  { entry: "Internet → web-prod-12", chain: "RCE → cred dump", target: "rds-prod-payments", hops: 4, score: 98, sev: "critical" as const, nodes: ["inet","web","build","vault","rds"] },
  { entry: "Phish → finance-laptop-08", chain: "MFA fatigue → Okta admin", target: "aws-prod root", hops: 5, score: 95, sev: "critical" as const, nodes: ["inet","phish","okta","aws"] },
  { entry: "Supply chain → build-runner-44", chain: "Token leak → vault", target: "rds-prod-payments", hops: 3, score: 92, sev: "critical" as const, nodes: ["build","vault","rds"] },
  { entry: "VPN → k.morgan session", chain: "Privilege esc → vault token", target: "secrets vault", hops: 4, score: 88, sev: "high" as const, nodes: ["phish","vpn","vault","kms"] },
  { entry: "Public S3 → leaked SAS key", chain: "Lateral → SQL admin", target: "customer-db", hops: 3, score: 84, sev: "high" as const, nodes: ["vpn","cust","kms"] },
];

const SEV_STROKE = { critical: "stroke-critical", high: "stroke-high", medium: "stroke-medium", info: "stroke-info", healthy: "stroke-healthy" } as const;

function AttackGraphPage() {
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState<number | null>(0);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const highlighted = useMemo(() => {
    if (active === null) return new Set<string>();
    return new Set(PATHS[active].nodes);
  }, [active]);

  const nodeById = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          <GitBranch className="size-3.5" /> Investigate
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Attack Graph</h1>
            <p className="text-sm text-muted-foreground max-w-3xl mt-1">
              Interactive blast-radius graph mapping identities, assets, and vulnerabilities into exploitable attack paths. Click a path to highlight, hover a node to see exposure.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface/60 p-1">
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} className="px-2 py-1 text-xs hover:bg-surface-2 rounded">−</button>
            <span className="px-2 text-[11px] font-mono tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} className="px-2 py-1 text-xs hover:bg-surface-2 rounded">+</button>
            <button onClick={() => setZoom(1)} className="ml-1 px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-muted-foreground hover:text-foreground">reset</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Graph nodes" value="184,210" icon={Network} tone="info" />
        <MetricCard label="Edges" value="1.4M" icon={Workflow} />
        <MetricCard label="Attack paths" value={2812} icon={GitBranch} tone="high" />
        <MetricCard label="To crown jewels" value={41} icon={Target} tone="critical" delta={{ v: "5", up: true }} />
        <MetricCard label="Choke points" value={12} icon={ShieldAlert} tone="high" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <section className="rounded-lg border border-border bg-surface/40 overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Skull className="size-3.5 text-critical" />
              <h3 className="text-sm font-medium">Live kill-chain topology</h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {active !== null ? `path #${active + 1} selected` : "all paths"}
            </span>
          </header>
          <div className="relative bg-[radial-gradient(circle_at_center,oklch(from_var(--surface)_l_c_h/0.4)_0%,transparent_70%)]">
            <svg viewBox="0 0 900 480" className="w-full h-[480px]" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
                </marker>
              </defs>
              {EDGES.map((e, i) => {
                const a = nodeById.get(e.from)!;
                const b = nodeById.get(e.to)!;
                const onPath = highlighted.has(a.id) && highlighted.has(b.id);
                return (
                  <g key={i}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      className={cn(
                        "transition-all",
                        onPath ? "stroke-critical" : "stroke-border",
                      )}
                      strokeWidth={onPath ? 2.5 : 1}
                      strokeDasharray={onPath ? "none" : "4 4"}
                      markerEnd="url(#arrow)"
                      opacity={active !== null && !onPath ? 0.25 : 1}
                    />
                  </g>
                );
              })}
              {NODES.map((n) => {
                const Icon = ICONS[n.kind];
                const isHi = highlighted.has(n.id);
                const isHover = hoverNode === n.id;
                const r = n.crownJewel ? 22 : 18;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    onMouseEnter={() => setHoverNode(n.id)}
                    onMouseLeave={() => setHoverNode(null)}
                    className="cursor-pointer"
                  >
                    {n.crownJewel && (
                      <circle r={r + 6} className="fill-none stroke-critical/40" strokeWidth={1} strokeDasharray="2 3">
                        <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="3s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      r={r}
                      className={cn(
                        "transition-all",
                        n.crownJewel ? "fill-critical/15 stroke-critical" :
                        n.risk > 70 ? "fill-high/15 stroke-high" :
                        n.risk > 40 ? "fill-medium/15 stroke-medium" :
                        "fill-surface stroke-border",
                      )}
                      strokeWidth={isHi || isHover ? 2.5 : 1.2}
                      opacity={active !== null && !isHi ? 0.4 : 1}
                    />
                    <foreignObject x={-9} y={-9} width={18} height={18} className="pointer-events-none">
                      <div className="flex h-full w-full items-center justify-center text-foreground">
                        <Icon className="size-4" />
                      </div>
                    </foreignObject>
                    <text y={r + 14} textAnchor="middle" className="fill-foreground text-[10px] font-mono">
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            {hoverNode && (() => {
              const n = nodeById.get(hoverNode)!;
              return (
                <div
                  className="absolute z-10 pointer-events-none rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg"
                  style={{ left: `${(n.x / 900) * 100}%`, top: `${(n.y / 480) * 100}%`, transform: "translate(-50%, -120%)" }}
                >
                  <div className="font-medium">{n.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">{n.kind} • risk {n.risk}</div>
                  {n.crownJewel && <div className="text-[10px] text-critical mt-1 font-mono">⚠ CROWN JEWEL</div>}
                </div>
              );
            })()}
          </div>
          <footer className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <LegendDot className="bg-critical" label="Crown jewel" />
            <LegendDot className="bg-high" label="High risk" />
            <LegendDot className="bg-medium" label="Medium" />
            <LegendDot className="bg-border" label="Asset" />
            <span className="ml-auto">click a path → highlight • hover node → detail</span>
          </footer>
        </section>

        <aside className="space-y-3">
          <section className="rounded-lg border border-border bg-surface/60">
            <header className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-medium flex items-center gap-2"><Zap className="size-3.5 text-high" /> Attack paths</h3>
            </header>
            <ul className="divide-y divide-border">
              {PATHS.map((p, i) => (
                <li
                  key={i}
                  onClick={() => setActive(active === i ? null : i)}
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
                  <div className="text-[10px] font-mono text-muted-foreground">→ {p.target} • {p.hops} hops</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-surface/60">
            <header className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-medium flex items-center gap-2"><Target className="size-3.5 text-critical" /> Crown jewels</h3>
            </header>
            <ul className="divide-y divide-border">
              {NODES.filter((n) => n.crownJewel).map((n) => (
                <li key={n.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <span className="font-mono">{n.label}</span>
                  <span className="text-[10px] font-mono text-critical">{n.risk} risk</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} /> {label}
    </span>
  );
}
