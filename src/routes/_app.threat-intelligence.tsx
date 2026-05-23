import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  Bug,
  Crosshair,
  Globe,
  Lock,
  Shield,
  Skull,
  Tag,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { makeMetricSeries } from "@/lib/mock/generators";
import { useInspector } from "@/lib/inspector-store";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/threat-intelligence")({
  head: () => ({ meta: [{ title: "Threat Intelligence — NEXUS" }] }),
  component: ThreatIntelligencePage,
});

/* ── static data ──────────────────────────────────────────────────────── */

const THREAT_ACTORS = [
  { id: "a1", name: "APT29", alias: "Cozy Bear / The Dukes", origin: "RU", motivation: "Espionage", ttps: ["T1078", "T1059", "T1071", "T1003"], status: "active" as const, lastSeen: Date.now() - 12 * 60_000, severity: "critical" as Severity },
  { id: "a2", name: "Lazarus Group", alias: "HIDDEN COBRA / Guardians of Peace", origin: "KP", motivation: "Financial / Espionage", ttps: ["T1486", "T1567", "T1190"], status: "active" as const, lastSeen: Date.now() - 60 * 60_000, severity: "critical" as Severity },
  { id: "a3", name: "FIN7", alias: "Carbanak / Joker Spider", origin: "Multi", motivation: "Financial", ttps: ["T1190", "T1059", "T1071"], status: "active" as const, lastSeen: Date.now() - 3 * 3600_000, severity: "high" as Severity },
  { id: "a4", name: "Scattered Spider", alias: "UNC3944 / Star Fraud", origin: "Multi", motivation: "Extortion", ttps: ["T1078", "T1110", "T1566"], status: "active" as const, lastSeen: Date.now() - 5 * 3600_000, severity: "high" as Severity },
  { id: "a5", name: "TA505", alias: "Clop / Bugat", origin: "RU", motivation: "Financial", ttps: ["T1071", "T1567", "T1486"], status: "dormant" as const, lastSeen: Date.now() - 14 * 86400_000, severity: "medium" as Severity },
  { id: "a6", name: "Volt Typhoon", alias: "BRONZE SILHOUETTE / Vanguard Panda", origin: "CN", motivation: "Espionage / Pre-positioning", ttps: ["T1003", "T1190", "T1078"], status: "active" as const, lastSeen: Date.now() - 86400_000, severity: "high" as Severity },
  { id: "a7", name: "Sandworm", alias: "IRIDIUM / Telebots", origin: "RU", motivation: "Disruption / Espionage", ttps: ["T1486", "T1498", "T1059"], status: "active" as const, lastSeen: Date.now() - 2 * 86400_000, severity: "critical" as Severity },
  { id: "a8", name: "APT41", alias: "Double Dragon / Barium", origin: "CN", motivation: "Espionage / Financial", ttps: ["T1190", "T1059", "T1078", "T1567"], status: "active" as const, lastSeen: Date.now() - 6 * 3600_000, severity: "high" as Severity },
];

const RANSOMWARE = [
  { id: "r1", name: "LockBit 3.0", encryption: "AES-256 + RSA", sectors: ["Finance", "Healthcare", "Manufacturing"], recentVictims: ["Bank of Valletta", "Continental AG", "Bangkok Airways"], severity: "critical" as Severity, active: true },
  { id: "r2", name: "BlackCat / ALPHV", encryption: "AES-256 (Rust)", sectors: ["Technology", "Legal", "Education"], recentVictims: ["MGM Resorts", "Caesars", "Reddit"], severity: "critical" as Severity, active: true },
  { id: "r3", name: "Cl0p", encryption: "AES-256 + RSA", sectors: ["Finance", "Government", "Healthcare"], recentVictims: ["MOVEit mass exploit", "EY", "BBC"], severity: "high" as Severity, active: true },
  { id: "r4", name: "Royal / BlackSuit", encryption: "AES-128 + RSA", sectors: ["Healthcare", "Education", "Manufacturing"], recentVictims: ["Dallas County", "CHKD"], severity: "high" as Severity, active: true },
  { id: "r5", name: "Play", encryption: "AES-256", sectors: ["Government", "Media", "Construction"], recentVictims: ["City of Oakland", "Rackspace"], severity: "high" as Severity, active: true },
  { id: "r6", name: "Conti", encryption: "AES-256 + RSA", sectors: ["Healthcare", "Government", "Critical Infra"], recentVictims: ["HSE Ireland", "JBS Foods"], severity: "medium" as Severity, active: false },
];

const IOC_FEEDS = [
  { id: "i1", type: "IP" as const, value: "185.220.101.34", source: "AlienVault OTX", confidence: 92, firstSeen: Date.now() - 7 * 86400_000, lastSeen: Date.now() - 2 * 3600_000, severity: "critical" as Severity },
  { id: "i2", type: "domain" as const, value: "update-service.c2net.xyz", source: "Abuse.ch", confidence: 97, firstSeen: Date.now() - 14 * 86400_000, lastSeen: Date.now() - 45 * 60_000, severity: "critical" as Severity },
  { id: "i3", type: "hash" as const, value: "a3f2b8c9d1e4f5a6b7c8d9e0f1a2b3c4", source: "Mandiant", confidence: 88, firstSeen: Date.now() - 3 * 86400_000, lastSeen: Date.now() - 6 * 3600_000, severity: "high" as Severity },
  { id: "i4", type: "IP" as const, value: "91.234.54.112", source: "Recorded Future", confidence: 85, firstSeen: Date.now() - 10 * 86400_000, lastSeen: Date.now() - 86400_000, severity: "high" as Severity },
  { id: "i5", type: "email" as const, value: "hr-onboarding@secure-docs.net", source: "Internal Sandbox", confidence: 94, firstSeen: Date.now() - 2 * 86400_000, lastSeen: Date.now() - 30 * 60_000, severity: "critical" as Severity },
  { id: "i6", type: "domain" as const, value: "cdn-assets.cloudfront-update.info", source: "AlienVault OTX", confidence: 79, firstSeen: Date.now() - 21 * 86400_000, lastSeen: Date.now() - 12 * 3600_000, severity: "medium" as Severity },
  { id: "i7", type: "hash" as const, value: "e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0", source: "VirusTotal", confidence: 91, firstSeen: Date.now() - 5 * 86400_000, lastSeen: Date.now() - 3 * 3600_000, severity: "high" as Severity },
  { id: "i8", type: "IP" as const, value: "45.133.1.87", source: "Abuse.ch", confidence: 82, firstSeen: Date.now() - 30 * 86400_000, lastSeen: Date.now() - 4 * 3600_000, severity: "medium" as Severity },
  { id: "i9", type: "email" as const, value: "support@payroll-portal.com", source: "Recorded Future", confidence: 76, firstSeen: Date.now() - 8 * 86400_000, lastSeen: Date.now() - 2 * 86400_000, severity: "medium" as Severity },
  { id: "i10", type: "hash" as const, value: "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6", source: "Internal Sandbox", confidence: 96, firstSeen: Date.now() - 1 * 86400_000, lastSeen: Date.now() - 15 * 60_000, severity: "critical" as Severity },
];

const CAMPAIGNS = [
  {
    id: "c1", name: "Operation Midnight Blizzard", actor: "APT29", sectors: ["Government", "Technology", "Defense"],
    events: [
      { at: Date.now() - 30 * 86400_000, desc: "Initial phishing wave targeting M365 tenants" },
      { at: Date.now() - 21 * 86400_000, desc: "Credential harvesting via EvilGinx proxy" },
      { at: Date.now() - 14 * 86400_000, desc: "Tenant-wide OAuth app implant deployed" },
      { at: Date.now() - 5 * 86400_000, desc: "Mail exfiltration via Graph API observed" },
      { at: Date.now() - 1 * 86400_000, desc: "Persistent access via backdoor service principals" },
    ],
    severity: "critical" as Severity,
  },
  {
    id: "c2", name: "Clop MOVEit Campaign", actor: "TA505 / Clop", sectors: ["Finance", "Government", "Healthcare"],
    events: [
      { at: Date.now() - 60 * 86400_000, desc: "Zero-day exploitation of MOVEit Transfer SQL injection" },
      { at: Date.now() - 45 * 86400_000, desc: "Mass data exfiltration from thousands of orgs" },
      { at: Date.now() - 20 * 86400_000, desc: "Extortion phase — leak sites updated" },
      { at: Date.now() - 5 * 86400_000, desc: "Supply chain downstream victims identified" },
    ],
    severity: "critical" as Severity,
  },
  {
    id: "c3", name: "Scattered Spider SIM-Swap", actor: "Scattered Spider", sectors: ["Telecom", "Crypto", "Technology"],
    events: [
      { at: Date.now() - 10 * 86400_000, desc: "Social engineering of telecom help-desk staff" },
      { at: Date.now() - 6 * 86400_000, desc: "SIM swaps enabling MFA bypass" },
      { at: Date.now() - 2 * 86400_000, desc: "Cryptocurrency exchange account takeovers" },
      { at: Date.now() - 12 * 3600_000, desc: "New targets identified in fintech sector" },
    ],
    severity: "high" as Severity,
  },
];

const EXPLOITS = [
  { id: "e1", cve: "CVE-2024-3400", name: "PAN-OS GlobalProtect Command Injection", severity: "critical" as Severity, weaponized: true, patched: true, cvss: 10.0, affectedProduct: "Palo Alto GlobalProtect" },
  { id: "e2", cve: "CVE-2024-1709", name: "ConnectWise ScreenConnect Auth Bypass", severity: "critical" as Severity, weaponized: true, patched: true, cvss: 10.0, affectedProduct: "ConnectWise ScreenConnect" },
  { id: "e3", cve: "CVE-2023-46805", name: "Ivanti Connect Secure Auth Bypass", severity: "critical" as Severity, weaponized: true, patched: true, cvss: 9.1, affectedProduct: "Ivanti Connect Secure" },
  { id: "e4", cve: "CVE-2024-27198", name: "TeamCity Auth Bypass RCE", severity: "critical" as Severity, weaponized: true, patched: true, cvss: 9.8, affectedProduct: "JetBrains TeamCity" },
  { id: "e5", cve: "CVE-2024-21762", name: "Fortinet FortiOS Out-of-Bound Write", severity: "critical" as Severity, weaponized: true, patched: true, cvss: 9.6, affectedProduct: "Fortinet FortiOS" },
  { id: "e6", cve: "CVE-2024-29824", name: "Ivanti EPM Agent RCE", severity: "critical" as Severity, weaponized: false, patched: true, cvss: 9.8, affectedProduct: "Ivanti EPM" },
  { id: "e7", cve: "CVE-2024-23897", name: "Jenkins CLI Arbitrary File Read", severity: "high" as Severity, weaponized: true, patched: true, cvss: 8.8, affectedProduct: "Jenkins" },
  { id: "e8", cve: "CVE-2024-20353", name: "Cisco ASA WebVPN DoS", severity: "medium" as Severity, weaponized: false, patched: true, cvss: 8.6, affectedProduct: "Cisco ASA" },
];

const ORIGIN_FLAGS: Record<string, string> = { RU: "🇷🇺", KP: "🇰🇵", CN: "🇨🇳", Multi: "🌐" };
const IOC_TYPE_ICON: Record<string, typeof Tag> = { IP: Globe, domain: Globe, hash: Shield, email: Target };

/* ── component ────────────────────────────────────────────────────────── */

function ThreatIntelligencePage() {
  const [activeTab, setActiveTab] = useState("actors");

  const kpiSeries = {
    iocs: makeMetricSeries(24, 280, 15),
    actors: makeMetricSeries(24, 12, 3),
    feeds: makeMetricSeries(24, 38, 1),
    hits: makeMetricSeries(24, 140, 40),
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-critical/15 text-critical">
          <Crosshair className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Threat Intelligence</h1>
          <p className="text-xs text-muted-foreground">Aggregated IOCs, actor tracking, and curated intel feeds enriched with internal telemetry</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Active IOCs" value="284k" icon={Tag} tone="info" series={kpiSeries.iocs} />
        <MetricCard label="Tracked Actors" value={1142} icon={Skull} tone="critical" series={kpiSeries.actors} />
        <MetricCard label="Feeds Online" value="38/40" icon={Activity} tone="healthy" series={kpiSeries.feeds} />
        <MetricCard label="Hits / 24h" value={3219} icon={TrendingUp} tone="high" series={kpiSeries.hits} delta={{ v: "8%", up: true }} />
        <MetricCard label="Geo Coverage" value="194" icon={Globe} tone="default" />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="actors" className="gap-1.5"><Skull className="size-3.5" /> Actors</TabsTrigger>
          <TabsTrigger value="iocs" className="gap-1.5"><Tag className="size-3.5" /> IOCs</TabsTrigger>
          <TabsTrigger value="ransomware" className="gap-1.5"><Lock className="size-3.5" /> Ransomware</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Target className="size-3.5" /> Campaigns</TabsTrigger>
          <TabsTrigger value="exploits" className="gap-1.5"><Bug className="size-3.5" /> Exploits</TabsTrigger>
        </TabsList>

        {/* ── Actors Tab ── */}
        <TabsContent value="actors">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {THREAT_ACTORS.map((actor) => (
              <div
                key={actor.id}
                className={cn(
                  "group rounded-lg border border-border bg-surface/60 p-4 transition-colors hover:border-border/80",
                  actor.status === "active" && "border-l-2 border-l-critical",
                  actor.status === "dormant" && "border-l-2 border-l-medium",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ORIGIN_FLAGS[actor.origin] ?? "🌐"}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{actor.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">{actor.alias}</p>
                    </div>
                  </div>
                  <SeverityBadge severity={actor.severity} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-muted-foreground">Origin</div>
                  <div className="font-mono">{actor.origin}</div>
                  <div className="text-muted-foreground">Motivation</div>
                  <div>{actor.motivation}</div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", actor.status === "active" ? "bg-critical animate-pulse" : "bg-medium")} />
                    <span className="capitalize">{actor.status}</span>
                  </div>
                  <div className="text-muted-foreground">Last seen</div>
                  <div className="font-mono tabular-nums">{formatDistanceToNow(actor.lastSeen, { addSuffix: true })}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {actor.ttps.map((ttp) => (
                    <span key={ttp} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {ttp}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── IOCs Tab ── */}
        <TabsContent value="iocs">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/40 text-left text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Value</th>
                  <th className="px-3 py-2.5 font-medium">Source</th>
                  <th className="px-3 py-2.5 font-medium">Confidence</th>
                  <th className="px-3 py-2.5 font-medium">Severity</th>
                  <th className="px-3 py-2.5 font-medium">First Seen</th>
                  <th className="px-3 py-2.5 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {IOC_FEEDS.map((ioc) => {
                  const IconComp = IOC_TYPE_ICON[ioc.type] ?? Tag;
                  return (
                    <tr key={ioc.id} className="border-b border-border/50 transition-colors hover:bg-surface/30">
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-mono uppercase text-muted-foreground">
                          <IconComp className="size-3" /> {ioc.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-foreground max-w-[260px] truncate" title={ioc.value}>
                        {ioc.value}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ioc.source}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                ioc.confidence >= 90 ? "bg-critical" : ioc.confidence >= 80 ? "bg-high" : "bg-medium",
                              )}
                              style={{ width: `${ioc.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums">{ioc.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><SeverityBadge severity={ioc.severity} /></td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                        {formatDistanceToNow(ioc.firstSeen, { addSuffix: true })}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                        {formatDistanceToNow(ioc.lastSeen, { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Ransomware Tab ── */}
        <TabsContent value="ransomware">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {RANSOMWARE.map((rw) => (
              <div
                key={rw.id}
                className={cn(
                  "rounded-lg border border-border bg-surface/60 p-4 transition-colors",
                  rw.active ? "border-l-2 border-l-critical" : "border-l-2 border-l-medium opacity-70",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className={cn("size-4", rw.active ? "text-critical" : "text-medium")} />
                    <h3 className="text-sm font-semibold">{rw.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={rw.severity} />
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        rw.active ? "bg-critical/15 text-critical" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {rw.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encryption</span>
                    <span className="font-mono">{rw.encryption}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Sectors</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {rw.sectors.map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recent Victims</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {rw.recentVictims.map((v) => (
                        <span key={v} className="rounded bg-high/10 px-1.5 py-0.5 text-[10px] text-high">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            {CAMPAIGNS.map((camp) => (
              <div key={camp.id} className="rounded-lg border border-border bg-surface/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-critical" />
                      <h3 className="text-sm font-semibold">{camp.name}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Linked actor: <span className="font-mono text-foreground">{camp.actor}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={camp.severity} />
                    <div className="flex flex-wrap gap-1">
                      {camp.sectors.map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-4 ml-1 border-l border-border pl-4 space-y-3">
                  {camp.events.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[1.125rem] top-1 size-2 rounded-full bg-border">
                        <div className={cn(
                          "absolute inset-0 rounded-full",
                          idx === camp.events.length - 1 ? "bg-critical animate-pulse" : "bg-muted-foreground",
                        )} />
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {formatDistanceToNow(ev.at, { addSuffix: true })}
                      </div>
                      <div className="text-xs text-foreground">{ev.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Exploits Tab ── */}
        <TabsContent value="exploits">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/40 text-left text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">CVE</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">CVSS</th>
                  <th className="px-3 py-2.5 font-medium">Severity</th>
                  <th className="px-3 py-2.5 font-medium">Weaponized</th>
                  <th className="px-3 py-2.5 font-medium">Patched</th>
                  <th className="px-3 py-2.5 font-medium">Product</th>
                </tr>
              </thead>
              <tbody>
                {EXPLOITS.map((ex) => (
                  <tr key={ex.id} className="border-b border-border/50 transition-colors hover:bg-surface/30">
                    <td className="px-3 py-2.5 font-mono text-info">{ex.cve}</td>
                    <td className="px-3 py-2.5 max-w-[280px] truncate" title={ex.name}>{ex.name}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          ex.cvss >= 9.0 ? "text-critical" : ex.cvss >= 7.0 ? "text-high" : "text-medium",
                        )}
                      >
                        {ex.cvss.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><SeverityBadge severity={ex.severity} /></td>
                    <td className="px-3 py-2.5">
                      {ex.weaponized ? (
                        <span className="inline-flex items-center gap-1 text-critical font-medium">
                          <Zap className="size-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {ex.patched ? (
                        <span className="inline-flex items-center gap-1 text-healthy">
                          <Shield className="size-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-critical font-medium">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{ex.affectedProduct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
