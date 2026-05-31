import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Cloud, CloudOff, Database, Globe, Lock, TriangleAlert as AlertTriangle, Server, Shield, ShieldAlert, ShieldCheck, KeyRound, MapPin, CircleCheck as CheckCircle2, Circle as XCircle, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge, SeverityDot } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { useCloudSummary, useCloudResources, useCloudAccounts, useCloudIamFindings, useCloudStorageBuckets, useCloudCompliance } from "@/lib/api-hooks";
import { Progress } from "@/components/ui/progress";
import { useInspector } from "@/lib/inspector-store";
import { formatDistanceToNow } from "date-fns";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/cloud-security")({
  head: () => ({ meta: [{ title: "Cloud Security — NEXUS" }] }),
  component: CloudSecurityPage,
});

/* ──────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ──────────────────────────────────────────────────────────────────── */

type Exposure = "public" | "internal" | "private";

const EXPOSURE_STYLES: Record<Exposure, string> = {
  public: "bg-critical/15 text-critical border-critical/40",
  internal: "bg-medium/15 text-medium border-medium/40",
  private: "bg-healthy/15 text-healthy border-healthy/40",
};

const EXPOSURE_LABELS: Record<Exposure, string> = {
  public: "Public",
  internal: "Internal",
  private: "Private",
};

function riskColor(score: number): string {
  if (score >= 75) return "text-critical";
  if (score >= 55) return "text-high";
  if (score >= 35) return "text-medium";
  return "text-healthy";
}

function riskBarColor(score: number): string {
  if (score >= 75) return "bg-critical";
  if (score >= 55) return "bg-high";
  if (score >= 35) return "bg-medium";
  return "bg-healthy";
}

function complianceTone(score: number): Severity {
  if (score >= 90) return "healthy";
  if (score >= 75) return "info";
  if (score >= 60) return "medium";
  return "critical";
}

const IAM_TYPE_LABEL: Record<string, string> = {
  overprivileged: "Overprivileged",
  wildcard: "Wildcard Policy",
  unused_credential: "Unused Credential",
  cross_account: "Cross-Account Access",
};

const PROVIDER_BADGE: Record<string, string> = {
  AWS: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  Azure: "bg-sky-500/15 text-sky-400 border-sky-500/40",
  GCP: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
};

/* ──────────────────────────────────────────────────────────────────── */
/* Component                                                            */
/* ──────────────────────────────────────────────────────────────────── */

function CloudSecurityPage() {
  const { data: summary, isLoading: summaryLoading } = useCloudSummary();
  const { data: resourcesData, isLoading: resourcesLoading } = useCloudResources();
  const { data: accountsData, isLoading: accountsLoading } = useCloudAccounts();
  const { data: iamFindingsData, isLoading: iamFindingsLoading } = useCloudIamFindings();
  const { data: storageBucketsData, isLoading: storageBucketsLoading } = useCloudStorageBuckets();
  const { data: complianceData, isLoading: complianceLoading } = useCloudCompliance();
  
  const resources = resourcesData?.items ?? [];
  const accounts = accountsData?.items ?? summary?.accounts ?? [];
  const iamFindings = iamFindingsData?.items ?? [];
  const buckets = storageBucketsData?.items ?? [];
  const compliance = complianceData?.items ?? [];
  
  const publicBuckets = buckets.filter((b) => b.publicAccess).length;
  const criticalResources = resources.filter((r) => r.severity === "critical").length;
  const highResources = resources.filter((r) => r.severity === "high").length;

  return (
    <div className="flex flex-col gap-5 p-5 min-h-full">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Cloud className="size-5 text-info" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Cloud Security</h1>
          <p className="text-xs text-muted-foreground">
            CSPM, CIEM, and workload posture across AWS, Azure, and GCP
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Accounts" value={summary?.accountCount ?? (isLoading ? "…" : accounts.length)} icon={Server} tone="default" />
        <MetricCard label="Resources" value={summary ? String(summary.totalAssets) : isLoading ? "…" : "—"} icon={Database} tone="info" />
        <MetricCard
          label="Open findings"
          value={summary?.openFindings ?? (isLoading ? "…" : "—")}
          icon={ShieldAlert}
          tone="critical"
        />
        <MetricCard
          label="Public buckets"
          value={publicBuckets}
          icon={CloudOff}
          tone="high"
        />
        <MetricCard
          label="Avg risk"
          value={summary ? `${summary.avgRisk}%` : isLoading ? "…" : "—"}
          icon={Lock}
          tone="healthy"
        />
      </div>

      {/* Main layout: left accounts + right detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Cloud account cards */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <SectionHeader icon={Server} title="Cloud Accounts" subtitle="Risk score per account" />
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[680px] pr-1">
            {accounts.map((acct) => (
              <AccountCard key={acct.id} account={acct} />
            ))}
          </div>
        </div>

        {/* RIGHT: Detail panels */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Exposed asset grid */}
          <div>
            <SectionHeader icon={Eye} title="Exposed Assets" subtitle="Resources by exposure status" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
              {RESOURCES.filter((r) => r.severity !== "healthy").map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>
          </div>

          {/* IAM + Storage row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* IAM analysis */}
            <div>
              <SectionHeader icon={KeyRound} title="IAM Findings" subtitle="Policy & credential analysis" />
              <div className="flex flex-col gap-1.5 mt-2">
                {IAM_FINDINGS.map((f) => (
                  <IAMRow key={f.id} finding={f} />
                ))}
              </div>
            </div>

            {/* Storage exposure */}
            <div>
              <SectionHeader icon={Database} title="Storage Exposure" subtitle="Bucket & blob posture" />
              <div className="flex flex-col gap-1.5 mt-2">
                {STORAGE_BUCKETS.map((b) => (
                  <StorageRow key={b.id} bucket={b} />
                ))}
              </div>
            </div>
          </div>

          {/* Region mapping + Compliance row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Region mapping */}
            <div>
              <SectionHeader icon={MapPin} title="Region Map" subtitle="Resources per region" />
              <div className="flex flex-col gap-2 mt-2">
                {REGIONS.map((reg) => (
                  <RegionRow key={reg.code} region={reg} />
                ))}
              </div>
            </div>

            {/* Compliance overlays */}
            <div>
              <SectionHeader icon={ShieldCheck} title="Compliance Overlays" subtitle="Framework status per account" />
              <div className="flex flex-col gap-2 mt-2">
                {ACCOUNTS.map((acct) => (
                  <ComplianceCard key={acct.id} account={acct} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
        {subtitle}
      </span>
    </div>
  );
}

function AccountCard({ account }: { account: CloudAccount }) {
  const barColor = riskBarColor(account.riskScore);
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider", PROVIDER_BADGE[account.provider])}>
            {account.provider}
          </span>
          <span className="text-sm font-medium truncate">{account.name}</span>
        </div>
        <span className={cn("text-lg font-bold tabular-nums", riskColor(account.riskScore))}>
          {account.riskScore}
        </span>
      </div>
      <Progress value={account.riskScore} className={cn("h-1.5", barColor)} />
      <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span>{account.resources.toLocaleString()} res.</span>
        <span className="text-critical">{account.criticalFindings} crit</span>
        <span className="text-high">{account.highFindings} high</span>
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: CloudResource }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider",
            EXPOSURE_STYLES[resource.exposure],
          )}
        >
          {EXPOSURE_LABELS[resource.exposure]}
        </span>
        <SeverityBadge severity={resource.severity} className="text-[9px]" />
      </div>
      <div className="text-sm font-medium truncate">{resource.name}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{resource.finding}</div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
        <span className={cn("inline-flex items-center rounded border px-1 py-0.5", PROVIDER_BADGE[resource.cloud])}>
          {resource.cloud}
        </span>
        <span>{resource.account}</span>
        <span className="ml-auto">{resource.age}</span>
      </div>
    </div>
  );
}

function IAMRow({ finding }: { finding: IAMPolicyFinding }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface/40 px-3 py-2 hover:bg-surface/60 transition-colors">
      <SeverityDot severity={finding.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{finding.principal}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{finding.account}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{finding.detail}</div>
      </div>
      <span className="shrink-0 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {IAM_TYPE_LABEL[finding.type]}
      </span>
      <span className="shrink-0 text-[10px] font-mono text-muted-foreground">{finding.age}</span>
    </div>
  );
}

function StorageRow({ bucket }: { bucket: StorageBucket }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface/40 px-3 py-2 hover:bg-surface/60 transition-colors">
      <SeverityDot severity={bucket.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{bucket.name}</span>
          <span className={cn("inline-flex items-center rounded border px-1 py-0.5 text-[9px] font-mono", PROVIDER_BADGE[bucket.cloud])}>
            {bucket.cloud}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">{bucket.region} &middot; {bucket.account}</div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {bucket.publicAccess && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-critical" title="Public access">
            <Globe className="size-3" /> Pub
          </span>
        )}
        {!bucket.encrypted && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-high" title="Unencrypted">
            <Lock className="size-3" /> Unenc
          </span>
        )}
        {bucket.piiDetected && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-critical" title="PII detected">
            <AlertTriangle className="size-3" /> PII
          </span>
        )}
        {bucket.encrypted && !bucket.publicAccess && !bucket.piiDetected && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-healthy" title="Secure">
            <Shield className="size-3" /> OK
          </span>
        )}
      </div>
    </div>
  );
}

type RegionInfo = (typeof REGIONS)[number];
function RegionRow({ region }: { region: RegionInfo }) {
  const healthPercent = region.healthy;
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2 hover:bg-surface/60 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <MapPin className="size-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{region.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {region.provider} &middot; {region.resources.toLocaleString()} resources
          </div>
        </div>
      </div>
      <div className="w-24 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-muted-foreground">Health</span>
          <span className={healthPercent >= 95 ? "text-healthy" : healthPercent >= 90 ? "text-info" : "text-medium"}>
            {healthPercent}%
          </span>
        </div>
        <Progress value={healthPercent} className="h-1" />
      </div>
      {region.critical > 0 && (
        <span className="shrink-0 text-[10px] font-mono text-critical">
          {region.critical} crit
        </span>
      )}
    </div>
  );
}

function ComplianceCard({ account }: { account: CloudAccount }) {
  return (
    <div className="rounded-md border border-border bg-surface/40 px-3 py-2.5 hover:bg-surface/60 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider", PROVIDER_BADGE[account.provider])}>
          {account.provider}
        </span>
        <span className="text-xs font-medium truncate">{account.name}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {account.compliance.map((c) => (
          <div key={c.framework} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider w-8 shrink-0">
              {c.framework}
            </span>
            <Progress value={c.score} className={cn("h-1.5 flex-1", complianceTone(c.score) === "healthy" ? "[&>div]:bg-healthy" : complianceTone(c.score) === "critical" ? "[&>div]:bg-critical" : complianceTone(c.score) === "medium" ? "[&>div]:bg-medium" : "[&>div]:bg-info")} />
            <span className={cn("text-[10px] font-mono tabular-nums w-8 text-right", complianceTone(c.score) === "healthy" ? "text-healthy" : complianceTone(c.score) === "critical" ? "text-critical" : complianceTone(c.score) === "medium" ? "text-medium" : "text-info")}>
              {c.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
