import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Cloud, CloudOff, Database, Globe, Lock, TriangleAlert as AlertTriangle, Server, Shield, ShieldAlert, ShieldCheck, KeyRound, MapPin, CircleCheck as CheckCircle2, Circle as XCircle, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge, SeverityDot } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { makeMetricSeries } from "@/lib/mock/generators";
import { Progress } from "@/components/ui/progress";
import { useInspector } from "@/lib/inspector-store";
import { formatDistanceToNow } from "date-fns";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/cloud-security")({
  head: () => ({ meta: [{ title: "Cloud Security — NEXUS" }] }),
  component: CloudSecurityPage,
});

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

type Exposure = "public" | "internal" | "private";

interface CloudResource {
  id: string;
  name: string;
  type: string;
  cloud: "AWS" | "Azure" | "GCP";
  account: string;
  region: string;
  exposure: Exposure;
  severity: Severity;
  finding: string;
  age: string;
  ageMs: number;
}

interface CloudAccount {
  id: string;
  name: string;
  provider: "AWS" | "Azure" | "GCP";
  resources: number;
  riskScore: number;
  criticalFindings: number;
  highFindings: number;
  compliance: { framework: string; score: number }[];
  regions: string[];
}

interface IAMPolicyFinding {
  id: string;
  type: "overprivileged" | "wildcard" | "unused_credential" | "cross_account";
  principal: string;
  account: string;
  detail: string;
  severity: Severity;
  age: string;
}

interface StorageBucket {
  id: string;
  name: string;
  cloud: "AWS" | "Azure" | "GCP";
  account: string;
  publicAccess: boolean;
  encrypted: boolean;
  piiDetected: boolean;
  severity: Severity;
  region: string;
}

const RESOURCES: CloudResource[] = [
  { id: "r1", name: "s3://acme-analytics-raw", type: "S3 Bucket", cloud: "AWS", account: "prod-data-872", region: "us-east-1", exposure: "public", severity: "critical", finding: "S3 bucket public-readable w/ PII", age: "2d", ageMs: 2 * 86400000 },
  { id: "r2", name: "snap-0af23…", type: "RDS Snapshot", cloud: "AWS", account: "prod-data-872", region: "us-east-1", exposure: "public", severity: "critical", finding: "RDS snapshot shared publicly", age: "5h", ageMs: 5 * 3600000 },
  { id: "r3", name: "gs://acme-reports", type: "GCS Bucket", cloud: "GCP", account: "growth-prod", region: "us-central1", exposure: "public", severity: "high", finding: "GCS bucket allUsers viewer", age: "1d", ageMs: 86400000 },
  { id: "r4", name: "saacmecorp01", type: "Storage Account", cloud: "Azure", account: "corp-it-01", region: "eastus", exposure: "internal", severity: "high", finding: "Storage account w/o private endpoint", age: "3d", ageMs: 3 * 86400000 },
  { id: "r5", name: "deploy-bot", type: "IAM User", cloud: "AWS", account: "sandbox-12", region: "us-west-2", exposure: "internal", severity: "high", finding: "IAM user with AdministratorAccess", age: "12d", ageMs: 12 * 86400000 },
  { id: "r6", name: "eks-prod-eu-1", type: "EKS Cluster", cloud: "AWS", account: "platform-eu", region: "eu-west-1", exposure: "public", severity: "medium", finding: "EKS cluster public API endpoint", age: "1d", ageMs: 86400000 },
  { id: "r7", name: "acme-ml-training", type: "S3 Bucket", cloud: "AWS", account: "ml-research", region: "us-west-2", exposure: "private", severity: "healthy", finding: "Properly configured", age: "—", ageMs: 0 },
  { id: "r8", name: "kv-acme-prod", type: "Key Vault", cloud: "Azure", account: "corp-it-01", region: "eastus", exposure: "private", severity: "healthy", finding: "Soft delete enabled", age: "—", ageMs: 0 },
  { id: "r9", name: "bigquery-datasets", type: "BigQuery Dataset", cloud: "GCP", account: "growth-prod", region: "us-central1", exposure: "internal", severity: "medium", finding: "Dataset shared with all authenticated users", age: "4d", ageMs: 4 * 86400000 },
  { id: "r10", name: "lambda-processor-prod", type: "Lambda Function", cloud: "AWS", account: "prod-data-872", region: "us-east-1", exposure: "public", severity: "high", finding: "Lambda function with public invoke permission", age: "6h", ageMs: 6 * 3600000 },
  { id: "r11", name: "nic-frontend-pub", type: "Network Interface", cloud: "Azure", account: "corp-it-01", region: "westeurope", exposure: "public", severity: "medium", finding: "Public IP attached to backend subnet NIC", age: "2d", ageMs: 2 * 86400000 },
  { id: "r12", name: "gke-staging-01", type: "GKE Cluster", cloud: "GCP", account: "staging-01", region: "europe-west1", exposure: "internal", severity: "healthy", finding: "Private cluster, authorized networks only", age: "—", ageMs: 0 },
];

const ACCOUNTS: CloudAccount[] = [
  { id: "a1", name: "prod-data-872", provider: "AWS", resources: 42180, riskScore: 82, criticalFindings: 14, highFindings: 47, compliance: [{ framework: "CIS", score: 68 }, { framework: "SOC2", score: 74 }, { framework: "PCI", score: 62 }], regions: ["us-east-1", "us-west-2", "eu-west-1"] },
  { id: "a2", name: "platform-eu", provider: "AWS", resources: 18740, riskScore: 61, criticalFindings: 3, highFindings: 22, compliance: [{ framework: "CIS", score: 82 }, { framework: "SOC2", score: 88 }, { framework: "PCI", score: 79 }], regions: ["eu-west-1", "eu-central-1"] },
  { id: "a3", name: "sandbox-12", provider: "AWS", resources: 8920, riskScore: 74, criticalFindings: 5, highFindings: 31, compliance: [{ framework: "CIS", score: 71 }, { framework: "SOC2", score: 65 }, { framework: "PCI", score: 58 }], regions: ["us-west-2"] },
  { id: "a4", name: "corp-it-01", provider: "Azure", resources: 31260, riskScore: 55, criticalFindings: 2, highFindings: 18, compliance: [{ framework: "CIS", score: 84 }, { framework: "SOC2", score: 91 }, { framework: "PCI", score: 86 }], regions: ["eastus", "westeurope"] },
  { id: "a5", name: "growth-prod", provider: "GCP", resources: 12880, riskScore: 68, criticalFindings: 4, highFindings: 26, compliance: [{ framework: "CIS", score: 77 }, { framework: "SOC2", score: 80 }, { framework: "PCI", score: 72 }], regions: ["us-central1", "europe-west1"] },
  { id: "a6", name: "ml-research", provider: "AWS", resources: 5640, riskScore: 38, criticalFindings: 0, highFindings: 5, compliance: [{ framework: "CIS", score: 91 }, { framework: "SOC2", score: 94 }, { framework: "PCI", score: 88 }], regions: ["us-west-2"] },
  { id: "a7", name: "staging-01", provider: "GCP", resources: 3420, riskScore: 29, criticalFindings: 0, highFindings: 3, compliance: [{ framework: "CIS", score: 93 }, { framework: "SOC2", score: 96 }, { framework: "PCI", score: 91 }], regions: ["europe-west1"] },
];

const IAM_FINDINGS: IAMPolicyFinding[] = [
  { id: "iam1", type: "overprivileged", principal: "deploy-bot", account: "sandbox-12", detail: "AdministratorAccess policy attached", severity: "high", age: "12d" },
  { id: "iam2", type: "wildcard", principal: "lambda-exec-role", account: "prod-data-872", detail: "s3:* on resource arn:*", severity: "critical", age: "3d" },
  { id: "iam3", type: "unused_credential", principal: "svc-legacy-api", account: "platform-eu", detail: "Access key unused for 90+ days", severity: "medium", age: "90d" },
  { id: "iam4", type: "cross_account", principal: "ext-contractor-role", account: "prod-data-872", detail: "Cross-account assume role from 3rd party", severity: "high", age: "7d" },
  { id: "iam5", type: "wildcard", principal: "cloudfunc-admin", account: "growth-prod", detail: "*:* on all resources", severity: "critical", age: "1d" },
  { id: "iam6", type: "overprivileged", principal: "terraform-apply", account: "sandbox-12", detail: "PowerUserAccess + IAM full access", severity: "high", age: "5d" },
  { id: "iam7", type: "unused_credential", principal: "old-backup-svc", account: "corp-it-01", detail: "Service principal inactive 60+ days", severity: "medium", age: "60d" },
  { id: "iam8", type: "cross_account", principal: "partner-read-role", account: "platform-eu", detail: "Read access from external AWS account", severity: "medium", age: "14d" },
];

const STORAGE_BUCKETS: StorageBucket[] = [
  { id: "b1", name: "acme-analytics-raw", cloud: "AWS", account: "prod-data-872", publicAccess: true, encrypted: true, piiDetected: true, severity: "critical", region: "us-east-1" },
  { id: "b2", name: "acme-reports", cloud: "GCP", account: "growth-prod", publicAccess: true, encrypted: true, piiDetected: false, severity: "high", region: "us-central1" },
  { id: "b3", name: "acme-ml-training", cloud: "AWS", account: "ml-research", publicAccess: false, encrypted: true, piiDetected: false, severity: "healthy", region: "us-west-2" },
  { id: "b4", name: "corp-backups-01", cloud: "Azure", account: "corp-it-01", publicAccess: false, encrypted: false, piiDetected: true, severity: "high", region: "eastus" },
  { id: "b5", name: "acme-static-assets", cloud: "AWS", account: "platform-eu", publicAccess: true, encrypted: true, piiDetected: false, severity: "medium", region: "eu-west-1" },
  { id: "b6", name: "acme-logs-archive", cloud: "GCP", account: "staging-01", publicAccess: false, encrypted: true, piiDetected: false, severity: "healthy", region: "europe-west1" },
  { id: "b7", name: "acme-finance-data", cloud: "AWS", account: "prod-data-872", publicAccess: false, encrypted: true, piiDetected: true, severity: "medium", region: "us-east-1" },
  { id: "b8", name: "acme-dev-drops", cloud: "Azure", account: "corp-it-01", publicAccess: true, encrypted: false, piiDetected: false, severity: "high", region: "westeurope" },
];

const REGIONS: { code: string; label: string; provider: string; resources: number; healthy: number; critical: number }[] = [
  { code: "us-east-1", label: "US East (N. Virginia)", provider: "AWS", resources: 38420, healthy: 94, critical: 11 },
  { code: "us-west-2", label: "US West (Oregon)", provider: "AWS", resources: 14560, healthy: 97, critical: 5 },
  { code: "eu-west-1", label: "EU (Ireland)", provider: "AWS", resources: 18740, healthy: 92, critical: 3 },
  { code: "eu-central-1", label: "EU (Frankfurt)", provider: "AWS", resources: 4210, healthy: 98, critical: 0 },
  { code: "eastus", label: "East US", provider: "Azure", resources: 22140, healthy: 95, critical: 2 },
  { code: "westeurope", label: "West Europe", provider: "Azure", resources: 9120, healthy: 96, critical: 1 },
  { code: "us-central1", label: "US Central (Iowa)", provider: "GCP", resources: 9840, healthy: 91, critical: 4 },
  { code: "europe-west1", label: "Europe West (Belgium)", provider: "GCP", resources: 6460, healthy: 94, critical: 0 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const IAM_TYPE_LABEL: Record<IAMPolicyFinding["type"], string> = {
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function CloudSecurityPage() {
  const seriesAccounts = useMemo(() => makeMetricSeries(48, 47, 2), []);
  const seriesResources = useMemo(() => makeMetricSeries(48, 184, 20), []);
  const seriesCritical = useMemo(() => makeMetricSeries(48, 312, 30), []);
  const seriesBuckets = useMemo(() => makeMetricSeries(48, 8, 3), []);
  const seriesEncrypted = useMemo(() => makeMetricSeries(48, 99, 1), []);

  const publicBuckets = STORAGE_BUCKETS.filter((b) => b.publicAccess).length;
  const unencryptedBuckets = STORAGE_BUCKETS.filter((b) => !b.encrypted).length;
  const piiBuckets = STORAGE_BUCKETS.filter((b) => b.piiDetected).length;

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
        <MetricCard label="Accounts" value={47} icon={Server} tone="default" series={seriesAccounts} />
        <MetricCard label="Resources" value="184k" icon={Database} tone="info" series={seriesResources} />
        <MetricCard
          label="Critical findings"
          value={312}
          icon={ShieldAlert}
          tone="critical"
          series={seriesCritical}
          delta={{ v: "11", up: true }}
        />
        <MetricCard
          label="Public buckets"
          value={publicBuckets}
          icon={CloudOff}
          tone="high"
          series={seriesBuckets}
        />
        <MetricCard
          label="Encrypted (rest)"
          value="99.1%"
          icon={Lock}
          tone="healthy"
          series={seriesEncrypted}
        />
      </div>

      {/* Main layout: left accounts + right detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Cloud account cards */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <SectionHeader icon={Server} title="Cloud Accounts" subtitle="Risk score per account" />
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[680px] pr-1">
            {ACCOUNTS.map((acct) => (
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
