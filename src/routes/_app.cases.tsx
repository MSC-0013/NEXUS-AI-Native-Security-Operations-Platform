import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Briefcase, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, User, Link, Shield, ChevronRight, FileText, Activity, ListChecks, Gavel, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { Checkbox } from "@/components/ui/checkbox";
import { useCases, useUpdateCase, useOrgUsers } from "@/lib/api-hooks";
import type { SeverityLevel as Severity } from "@nexus/shared";

export const Route = createFileRoute("/_app/cases")({
  head: () => ({
    meta: [
      { title: "Cases â€” NEXUS" },
      { name: "description", content: "Case management with response workflows, evidence tracking, and SLA monitoring." },
    ],
  }),
  component: CasesPage,
});

/* â”€â”€ types â”€â”€ */

type CaseStatus = "open" | "in_progress" | "review" | "closed";
type WorkflowStep = "triage" | "analyze" | "contain" | "remediate" | "close";

interface CaseData {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  status: CaseStatus;
  assignee: string;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaBreached: boolean;
  workflowStep: WorkflowStep;
  linkedAlerts: { code: string; title: string; severity: Severity }[];
  linkedIncidents: { code: string; title: string; severity: Severity }[];
  endpoints: { hostname: string; os: string; lastSeen: string }[];
  evidence: { type: string; source: string; timestamp: string; description: string }[];
  activityFeed: { at: string; actor: string; action: string; detail: string }[];
  remediationChecklist: { id: string; label: string; done: boolean }[];
}

/* â”€â”€ constants â”€â”€ */

const STATUS_STYLE: Record<CaseStatus, string> = {
  open: "bg-critical/15 text-critical border-critical/40",
  in_progress: "bg-high/15 text-high border-high/40",
  review: "bg-info/15 text-info border-info/40",
  closed: "bg-healthy/15 text-healthy border-healthy/40",
};

const WORKFLOW_STEPS: WorkflowStep[] = ["triage", "analyze", "contain", "remediate", "close"];

// Map persisted case status <-> visual workflow step so the workflow always
// reflects (and drives) the real database status.
const STATUS_TO_STEP: Record<CaseStatus, WorkflowStep> = {
  open: "triage",
  in_progress: "analyze",
  review: "remediate",
  closed: "close",
};
const STEP_TO_STATUS: Record<WorkflowStep, CaseStatus> = {
  triage: "open",
  analyze: "in_progress",
  contain: "in_progress",
  remediate: "review",
  close: "closed",
};

const WORKFLOW_STYLE: Record<WorkflowStep, string> = {
  triage: "text-critical",
  analyze: "text-high",
  contain: "text-medium",
  remediate: "text-info",
  close: "text-healthy",
};

const CASE_CLOCK_MS = Date.parse("2026-06-03T03:00:00.000Z");
const d = (days: number) => new Date(CASE_CLOCK_MS - 86400000 * days).toISOString();
const h = (hours: number) => new Date(CASE_CLOCK_MS - 3600000 * hours).toISOString();
const hFuture = (hours: number) => new Date(CASE_CLOCK_MS + 3600000 * hours).toISOString();

const CASES: CaseData[] = [
  {
    id: "case-1", code: "CASE-7001", title: "Ransomware deployment via GPO hijack", severity: "critical", status: "in_progress",
    assignee: "amelia.lee", createdAt: d(1), updatedAt: h(0.5), slaDeadline: hFuture(2), slaBreached: false, workflowStep: "contain",
    linkedAlerts: [{ code: "ALR-3012", title: "GPO modification outside change window", severity: "critical" }, { code: "ALR-3018", title: "Mass file encryption on file-server-02", severity: "critical" }],
    linkedIncidents: [{ code: "INC-1003", title: "LSASS dump attempt on finance workstation", severity: "critical" }],
    endpoints: [{ hostname: "dc-01.corp", os: "Windows Server 2022", lastSeen: "3m ago" }, { hostname: "file-server-02", os: "Windows Server 2019", lastSeen: "1m ago" }],
    evidence: [
      { type: "log", source: "windows-event", timestamp: h(2), description: "GPO modification event 5136 detected" },
      { type: "file", source: "edr-falconlite", timestamp: h(1.5), description: "dropper payload win-update.exe on dc-01" },
      { type: "network", source: "zeek", timestamp: h(1), description: "4.1 GB egress to 185.234.72.11" },
      { type: "memory", source: "volatility", timestamp: h(0.5), description: "LSASS dump artifact in memory" },
    ],
    activityFeed: [
      { at: h(0.5), actor: "amelia.lee", action: "Isolated dc-01 from network", detail: "EDR containment policy applied" },
      { at: h(1), actor: "nexus-ai", action: "Correlated GPO change with ransomware IOCs", detail: "T1486 pattern match, 92% confidence" },
      { at: h(2), actor: "edr-falconlite", action: "Detected GPO modification", detail: "Event 5136 â€” new scheduled task deployed" },
      { at: h(3), actor: "amelia.lee", action: "Escalated to case", detail: "Promoted from alert ALR-3012" },
    ],
    remediationChecklist: [
      { id: "rc-1", label: "Isolate affected domain controllers", done: true },
      { id: "rc-2", label: "Revoke compromised GPO links", done: true },
      { id: "rc-3", label: "Collect forensic disk images", done: false },
      { id: "rc-4", label: "Reset krbtgt account password (twice)", done: false },
      { id: "rc-5", label: "Deploy ransomware decryption keys if available", done: false },
      { id: "rc-6", label: "Verify backup integrity and restore", done: false },
    ],
  },
  {
    id: "case-2", code: "CASE-7002", title: "Cloud IAM privilege escalation via wildcard policy", severity: "high", status: "in_progress",
    assignee: "h.tanaka", createdAt: d(1), updatedAt: h(2), slaDeadline: hFuture(4), slaBreached: false, workflowStep: "analyze",
    linkedAlerts: [{ code: "ALR-3020", title: "Wildcard IAM policy attached", severity: "high" }],
    linkedIncidents: [{ code: "INC-1015", title: "Privileged IAM role outside change window", severity: "high" }],
    endpoints: [{ hostname: "build-runner-44", os: "Debian 12", lastSeen: "15m ago" }],
    evidence: [
      { type: "log", source: "aws-cloudtrail", timestamp: h(3), description: "AttachUserPolicy â€” AdminFullAccess granted" },
      { type: "log", source: "okta", timestamp: h(3.5), description: "API key auth from unknown ASN AS134023" },
    ],
    activityFeed: [
      { at: h(2), actor: "h.tanaka", action: "Revoked API key AKIA...F4E2", detail: "Key had no MFA â€” revoked immediately" },
      { at: h(3), actor: "nexus-ai", action: "Flagged privilege escalation", detail: "2-minute window between auth and policy attach" },
    ],
    remediationChecklist: [
      { id: "rc-7", label: "Revoke compromised API key", done: true },
      { id: "rc-8", label: "Audit all actions by svc-deploy-bot (24h)", done: false },
      { id: "rc-9", label: "Remove wildcard policy attachment", done: false },
      { id: "rc-10", label: "Enforce MFA on all API keys", done: false },
    ],
  },
  {
    id: "case-3", code: "CASE-7003", title: "Data exfiltration from EU analytics cluster", severity: "high", status: "in_progress",
    assignee: "marco.cruz", createdAt: d(3), updatedAt: h(4), slaDeadline: hFuture(6), slaBreached: false, workflowStep: "analyze",
    linkedAlerts: [{ code: "ALR-3025", title: "Anomalous data egress from analytics cluster", severity: "high" }],
    linkedIncidents: [{ code: "INC-1018", title: "Anomalous data egress from EU cluster", severity: "high" }],
    endpoints: [{ hostname: "analytics-etl-03.eu-west", os: "Ubuntu 22.04", lastSeen: "5m ago" }],
    evidence: [{ type: "network", source: "zeek", timestamp: h(6), description: "4.2 GB transfer to Azure blob storage" }],
    activityFeed: [
      { at: h(4), actor: "marco.cruz", action: "Initiated data exfil investigation", detail: "ETL pipeline source confirmed" },
      { at: h(6), actor: "zeek", action: "Detected large outbound transfer", detail: "4.2 GB over 6h to unmonitored subscription" },
    ],
    remediationChecklist: [
      { id: "rc-11", label: "Block egress to unknown Azure subscription", done: false },
      { id: "rc-12", label: "Rotate svc-etl-pipeline credentials", done: false },
      { id: "rc-13", label: "Audit data access logs for 48h window", done: false },
    ],
  },
  {
    id: "case-4", code: "CASE-7004", title: "C2 beaconing from build agent via DNS tunneling", severity: "high", status: "review",
    assignee: "j.okafor", createdAt: d(5), updatedAt: d(1), slaDeadline: d(0), slaBreached: true, workflowStep: "remediate",
    linkedAlerts: [{ code: "ALR-3031", title: "DGA-like DNS query pattern", severity: "high" }],
    linkedIncidents: [{ code: "INC-1011", title: "C2 beaconing from build agent", severity: "high" }],
    endpoints: [{ hostname: "build-runner-44", os: "Debian 12", lastSeen: "1d ago" }],
    evidence: [
      { type: "network", source: "suricata", timestamp: d(3), description: "High-entropy DNS queries at 60s intervals" },
      { type: "disk", source: "forensics", timestamp: d(2), description: "Cobalt Strike beacon artifact on disk" },
    ],
    activityFeed: [
      { at: d(1), actor: "j.okafor", action: "Disk image shipped to forensics", detail: "Awaiting results by EOD Monday" },
      { at: d(2), actor: "j.okafor", action: "Isolated build-runner-44", detail: "DNS sinkhole configured" },
    ],
    remediationChecklist: [
      { id: "rc-14", label: "Isolate endpoint", done: true },
      { id: "rc-15", label: "Configure DNS sinkhole", done: true },
      { id: "rc-16", label: "Complete forensic disk analysis", done: false },
      { id: "rc-17", label: "Rebuild host from clean image", done: false },
    ],
  },
  {
    id: "case-5", code: "CASE-7005", title: "Credential stuffing campaign against Okta tenant", severity: "medium", status: "closed",
    assignee: "n.patel", createdAt: d(7), updatedAt: d(2), slaDeadline: d(3), slaBreached: false, workflowStep: "close",
    linkedAlerts: [{ code: "ALR-3040", title: "Bulk failed logins from proxy IPs", severity: "medium" }],
    linkedIncidents: [{ code: "INC-1002", title: "Credential stuffing campaign", severity: "medium" }],
    endpoints: [],
    evidence: [{ type: "log", source: "okta", timestamp: d(7), description: "38 targeted users, 2 proxy ASNs" }],
    activityFeed: [
      { at: d(2), actor: "n.patel", action: "Closed case â€” MFA at 100%", detail: "All compromised accounts reset" },
      { at: d(4), actor: "n.patel", action: "Enforced MFA org-wide", detail: "FIDO2 required for admin+privileged" },
    ],
    remediationChecklist: [
      { id: "rc-18", label: "Enforce MFA org-wide", done: true },
      { id: "rc-19", label: "Reset compromised accounts", done: true },
      { id: "rc-20", label: "Update IP blocklist", done: true },
    ],
  },
  {
    id: "case-6", code: "CASE-7006", title: "Impossible travel for executive account", severity: "medium", status: "open",
    assignee: "s.ivanov", createdAt: h(6), updatedAt: h(1), slaDeadline: hFuture(8), slaBreached: false, workflowStep: "triage",
    linkedAlerts: [{ code: "ALR-3045", title: "Impossible travel â€” NYC/Lagos 9min", severity: "medium" }], linkedIncidents: [],
    endpoints: [], evidence: [{ type: "log", source: "okta", timestamp: h(6), description: "c.eo auth from NYC and Lagos within 9 min" }],
    activityFeed: [
      { at: h(1), actor: "s.ivanov", action: "Revoked Lagos session tokens", detail: "Pre-emptive revocation" },
      { at: h(6), actor: "okta", action: "Flagged impossible travel", detail: "9-min gap between NYC and Lagos" },
    ],
    remediationChecklist: [
      { id: "rc-21", label: "Verify with physical security", done: false },
      { id: "rc-22", label: "Revoke anomalous session if confirmed", done: false },
      { id: "rc-23", label: "Require re-auth with FIDO2", done: false },
    ],
  },
  {
    id: "case-7", code: "CASE-7007", title: "K8s privileged container in payments namespace", severity: "medium", status: "review",
    assignee: "h.tanaka", createdAt: d(4), updatedAt: h(12), slaDeadline: hFuture(12), slaBreached: false, workflowStep: "remediate",
    linkedAlerts: [{ code: "ALR-3050", title: "Privileged container in payments ns", severity: "medium" }],
    linkedIncidents: [{ code: "INC-1020", title: "K8s API audit anomaly", severity: "medium" }],
    endpoints: [{ hostname: "k8s-node-prod-09", os: "Bottlerocket", lastSeen: "1m ago" }],
    evidence: [{ type: "log", source: "k8s-audit", timestamp: d(2), description: "pay-gateway-7b8f running as privileged" }],
    activityFeed: [
      { at: h(12), actor: "h.tanaka", action: "Traced to CI misconfiguration", detail: "Dockerfile lacked securityContext" },
    ],
    remediationChecklist: [
      { id: "rc-24", label: "Fix Dockerfile securityContext", done: true },
      { id: "rc-25", label: "Update Helm chart", done: true },
      { id: "rc-26", label: "Monitor 48h for recurrence", done: false },
    ],
  },
  {
    id: "case-8", code: "CASE-7008", title: "SQL injection probes on customer portal", severity: "info", status: "closed",
    assignee: "amelia.lee", createdAt: d(6), updatedAt: d(3), slaDeadline: d(4), slaBreached: false, workflowStep: "close",
    linkedAlerts: [{ code: "ALR-3055", title: "SQLi probe blocked by WAF", severity: "info" }], linkedIncidents: [],
    endpoints: [], evidence: [{ type: "log", source: "suricata", timestamp: d(6), description: "WAF rule matched on /api/v2/users" }],
    activityFeed: [{ at: d(3), actor: "amelia.lee", action: "Closed â€” no exfiltration", detail: "WAF rule updated" }],
    remediationChecklist: [
      { id: "rc-27", label: "Update WAF rules for SQLi pattern", done: true },
      { id: "rc-28", label: "Confirm no data exfiltration", done: true },
    ],
  },
  {
    id: "case-9", code: "CASE-7009", title: "Phishing campaign targeting finance team", severity: "high", status: "in_progress",
    assignee: "n.patel", createdAt: h(8), updatedAt: h(1), slaDeadline: hFuture(10), slaBreached: false, workflowStep: "contain",
    linkedAlerts: [{ code: "ALR-3060", title: "Phishing email with malicious attachment", severity: "high" }, { code: "ALR-3062", title: "Credential harvest page on lookalike domain", severity: "high" }],
    linkedIncidents: [], endpoints: [{ hostname: "win-finance-08", os: "Windows 11", lastSeen: "5m ago" }],
    evidence: [
      { type: "email", source: "proofpoint", timestamp: h(8), description: "Phishing email with .xlsm attachment" },
      { type: "network", source: "zeek", timestamp: h(6), description: "Connection to harvest.domain-corp.com" },
    ],
    activityFeed: [
      { at: h(1), actor: "n.patel", action: "Blocked lookalike domain", detail: "DNS sinkhole for *.domain-corp.com" },
      { at: h(3), actor: "nexus-ai", action: "Correlated phishing with credential harvest", detail: "12 users clicked, 3 submitted creds" },
    ],
    remediationChecklist: [
      { id: "rc-29", label: "Block lookalike domain", done: true },
      { id: "rc-30", label: "Reset credentials for 3 affected users", done: false },
      { id: "rc-31", label: "Quarantine malicious emails", done: true },
      { id: "rc-32", label: "Send security awareness reminder", done: false },
    ],
  },
  {
    id: "case-10", code: "CASE-7010", title: "Suspicious scheduled task on MSSQL server", severity: "medium", status: "open",
    assignee: "j.okafor", createdAt: h(3), updatedAt: h(1), slaDeadline: hFuture(14), slaBreached: false, workflowStep: "triage",
    linkedAlerts: [{ code: "ALR-3070", title: "Scheduled task referencing C2 domain", severity: "medium" }],
    linkedIncidents: [{ code: "INC-1003", title: "LSASS dump on finance workstation", severity: "critical" }],
    endpoints: [{ hostname: "db-mssql-03", os: "Windows Server 2022", lastSeen: "8m ago" }],
    evidence: [{ type: "log", source: "edr-falconlite", timestamp: h(3), description: "schtasks /create referencing update.svc-cloud.xyz" }],
    activityFeed: [{ at: h(1), actor: "j.okafor", action: "Escalated to case", detail: "Linked to INC-1003 C2 infrastructure" }],
    remediationChecklist: [
      { id: "rc-33", label: "Investigate scheduled task persistence", done: false },
      { id: "rc-34", label: "Correlate with C2 indicators from INV-4001", done: false },
      { id: "rc-35", label: "Assess MSSQL server integrity", done: false },
    ],
  },
];

/* â”€â”€ component â”€â”€ */

function mapCaseStatus(s: string): CaseStatus {
  if (s === "in_progress" || s === "investigating") return "in_progress";
  if (s === "review" || s === "pending_review") return "review";
  if (s === "closed" || s === "resolved") return "closed";
  return "open";
}

function formatCaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatCaseAge(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Unknown";
  const diff = Math.max(0, CASE_CLOCK_MS - time);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  return `${minutes}m ago`;
}

function CasesPage() {
  const { data: casesData, isLoading } = useCases();
  const casesList: CaseData[] = useMemo(() => {
    const items = casesData?.items ?? [];
    if (items.length === 0) return CASES;
    return items.map((c) => ({
      id: c.id,
      code: c.caseNumber,
      title: c.title,
      severity: (c.priority === "critical" ? "critical" : c.priority === "high" ? "high" : "medium") as Severity,
      status: mapCaseStatus(c.status),
      assignee: c.owner,
      ownerId: c.ownerId,
      createdAt: c.createdAt ?? new Date(CASE_CLOCK_MS).toISOString(),
      updatedAt: c.updatedAt ?? c.createdAt ?? new Date(CASE_CLOCK_MS).toISOString(),
      slaDeadline: new Date(Date.parse(c.updatedAt ?? c.createdAt ?? new Date(CASE_CLOCK_MS).toISOString()) + 86400000).toISOString(),
      slaBreached: false,
      workflowStep: STATUS_TO_STEP[mapCaseStatus(c.status)],
      linkedAlerts: [],
      linkedIncidents: [],
      endpoints: [],
      evidence: [],
      activityFeed: [],
      remediationChecklist: [],
    }));
  }, [casesData]);
  const { data: usersData } = useOrgUsers();
  const updateCase = useUpdateCase();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveId = selectedId ?? casesList[0]?.id ?? "";
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const sel = casesList.find((c) => c.id === effectiveId) ?? casesList[0];
  // Cases sourced from the API have UUID ids; only those can be mutated server-side.
  const isApiCase = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(effectiveId);
  const orgUsers = usersData?.items ?? [];

  const openCt = casesList.filter((c) => c.status === "open").length;
  const inProgressCt = casesList.filter((c) => c.status === "in_progress").length;
  const reviewCt = casesList.filter((c) => c.status === "review").length;
  const breachedCt = casesList.filter((c) => c.slaBreached).length;

  if (!sel) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        {isLoading ? "Loading casesâ€¦" : "No cases found."}
      </div>
    );
  }

  const toggleCheck = (id: string) => setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const slaRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - CASE_CLOCK_MS;
    if (diff <= 0) return "Breached";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* left panel â€” case list */}
      <div className="w-full lg:w-[420px] lg:min-w-[420px] border-r border-border bg-surface/40 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Response / Cases</div>
          <h1 className="text-xl font-semibold tracking-tight mt-0.5">Cases</h1>
          <div className="grid grid-cols-4 gap-2 mt-3">
            <MetricCard label="Open" value={openCt} icon={Briefcase} tone="critical" />
            <MetricCard label="In Progress" value={inProgressCt} icon={Activity} tone="high" />
            <MetricCard label="Review" value={reviewCt} icon={Shield} tone="info" />
            <MetricCard label="SLA Breach" value={breachedCt} icon={AlertTriangle} tone={breachedCt > 0 ? "critical" : "healthy"} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {casesList.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={cn("w-full text-left px-4 py-3 border-b border-border/60 transition-colors",
                effectiveId === c.id ? "bg-surface-2/80 border-l-2 border-l-primary" : "hover:bg-surface-2/40",
              )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{c.code}</span>
                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono", STATUS_STYLE[c.status])}>{c.status.replace("_", " ")}</span>
                    {c.slaBreached && (
                      <span className="inline-flex items-center gap-0.5 rounded border border-critical/40 bg-critical/10 px-1 py-0.5 text-[9px] font-mono text-critical">
                        <AlertTriangle className="size-2.5" />SLA
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium leading-snug truncate">{c.title}</div>
                </div>
                <SeverityBadge severity={c.severity} className="shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                <span className="inline-flex items-center gap-1"><User className="size-3" />{c.assignee}</span>
                <span className="inline-flex items-center gap-1"><Link className="size-3" />{c.linkedAlerts.length}a / {c.linkedIncidents.length}i</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" />{slaRemaining(c.slaDeadline)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* right panel â€” case detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
          {/* header */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              <Briefcase className="size-3" />
              {sel.code}
              <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono", STATUS_STYLE[sel.status])}>{sel.status.replace("_", " ")}</span>
              <SeverityBadge severity={sel.severity} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{sel.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1"><User className="size-3" />{sel.assignee}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Created {formatCaseAge(sel.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Updated {formatCaseAge(sel.updatedAt)}</span>
              <span className={cn("inline-flex items-center gap-1", sel.slaBreached ? "text-critical font-semibold" : "")}>
                <AlertTriangle className="size-3" />SLA: {slaRemaining(sel.slaDeadline)}
              </span>
            </div>
          </div>

          {/* assignee selector */}
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="size-3.5" /> Assignee
                {updateCase.isPending && <span className="text-[9px] normal-case text-muted-foreground/70">saving…</span>}
              </div>
              {isApiCase && orgUsers.length > 0 ? (
                <select
                  value={sel.ownerId ?? ""}
                  disabled={updateCase.isPending}
                  onChange={(e) => updateCase.mutate({ id: sel.id, ownerId: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="" disabled>Unassigned</option>
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-muted-foreground">
                  {sel.assignee}
                </span>
              )}
            </div>
          </section>

          {/* workflow steps */}
          <section className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Gavel className="size-3.5" /> Response Workflow
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-1">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const currentIdx = WORKFLOW_STEPS.indexOf(sel.workflowStep);
                  const isActive = step === sel.workflowStep;
                  const isDone = idx < currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-1 flex-1">
                      <button
                        type="button"
                        disabled={!isApiCase || updateCase.isPending}
                        onClick={() => updateCase.mutate({ id: sel.id, status: STEP_TO_STATUS[step] })}
                        title={isApiCase ? `Set status to ${STEP_TO_STATUS[step].replace("_", " ")}` : "Workflow available for saved cases"}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider w-full",
                          isActive ? "border-primary bg-primary/10 text-primary" : isDone ? "border-healthy/40 bg-healthy/10 text-healthy" : "border-border bg-background text-muted-foreground",
                          isApiCase && !isActive && "hover:border-primary/60 hover:text-foreground",
                          (!isApiCase || updateCase.isPending) && "cursor-not-allowed",
                        )}
                      >
                        {isDone ? <CheckCircle className="size-3" /> : isActive ? <ChevronRight className="size-3" /> : null}
                        {step}
                      </button>
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <div className={cn("h-px w-3 shrink-0", idx < currentIdx ? "bg-healthy/40" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
            {/* main column */}
            <div className="space-y-5">
              {/* evidence management */}
              <Section header="Evidence" icon={<FileText className="size-3.5" />}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Source</th>
                      <th className="px-4 py-2 font-medium">Description</th>
                      <th className="px-4 py-2 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sel.evidence.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/40">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">{ev.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{ev.source}</td>
                        <td className="px-4 py-2.5 text-xs">{ev.description}</td>
                        <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {formatCaseAge(ev.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {/* remediation checklist */}
              <Section header="Remediation Checklist" icon={<ListChecks className="size-3.5" />}>
                <div className="divide-y divide-border/50">
                  {sel.remediationChecklist.map((item) => {
                    const checked = item.done || checkedItems[item.id];
                    return (
                      <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-2/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCheck(item.id)}
                          className={cn(checked && "data-[state=checked]:bg-healthy data-[state=checked]:border-healthy")}
                        />
                        <span className={cn("text-sm", checked && "line-through text-muted-foreground")}>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Progress</span>
                    <span>{sel.remediationChecklist.filter((i) => i.done || checkedItems[i.id]).length}/{sel.remediationChecklist.length} complete</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-healthy transition-all"
                      style={{ width: `${(sel.remediationChecklist.filter((i) => i.done || checkedItems[i.id]).length / sel.remediationChecklist.length) * 100}%` }}
                    />
                  </div>
                </div>
              </Section>

              {/* endpoint association */}
              {sel.endpoints.length > 0 && (
                <Section header="Endpoints" icon={<Shield className="size-3.5" />}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Host</th>
                        <th className="px-4 py-2 font-medium">OS</th>
                        <th className="px-4 py-2 font-medium">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {sel.endpoints.map((ep) => (
                        <tr key={ep.hostname} className="hover:bg-surface-2/40">
                          <td className="px-4 py-2.5 font-mono text-xs">{ep.hostname}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{ep.os}</td>
                          <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground">{ep.lastSeen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {/* activity feed */}
              <Section header="Activity Feed" icon={<Activity className="size-3.5" />}>
                <div className="divide-y divide-border/50">
                  {sel.activityFeed.map((entry, idx) => (
                    <div key={idx} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-medium text-foreground">{entry.actor}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{formatCaseAge(entry.at)}</span>
                      </div>
                      <div className="text-sm">{entry.action}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{entry.detail}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* sidebar column */}
            <div className="space-y-5">
              {/* SLA tracking */}
              <section className={cn("rounded-lg border bg-surface/60 p-4",
                sel.slaBreached ? "border-critical/60" : "border-border")}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Clock className="size-3.5" /> SLA Tracking
                </div>
                <div className={cn("text-3xl font-semibold tabular-nums", sel.slaBreached ? "text-critical" : "text-foreground")}>
                  {slaRemaining(sel.slaDeadline)}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">
                  Deadline: {formatCaseDate(sel.slaDeadline)}
                </div>
                {sel.slaBreached && (
                  <div className="flex items-center gap-1.5 mt-2 rounded-md border border-critical/40 bg-critical/10 px-2 py-1.5 text-[10px] font-mono text-critical">
                    <X className="size-3" /> SLA BREACHED â€” Immediate escalation required
                  </div>
                )}
              </section>

              {/* linked alerts */}
              <section className="rounded-lg border border-border bg-surface/60">
                <div className="px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" /> Linked Alerts
                </div>
                {sel.linkedAlerts.length === 0 ? (
                  <div className="px-4 py-4 text-[11px] text-muted-foreground">No linked alerts</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {sel.linkedAlerts.map((alert) => (
                      <div key={alert.code} className="flex items-center gap-2 px-4 py-2.5">
                        <SeverityBadge severity={alert.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono text-muted-foreground">{alert.code}</div>
                          <div className="text-xs truncate">{alert.title}</div>
                        </div>
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* linked incidents */}
              <section className="rounded-lg border border-border bg-surface/60">
                <div className="px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="size-3.5" /> Linked Incidents
                </div>
                {sel.linkedIncidents.length === 0 ? (
                  <div className="px-4 py-4 text-[11px] text-muted-foreground">No linked incidents</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {sel.linkedIncidents.map((inc) => (
                      <div key={inc.code} className="flex items-center gap-2 px-4 py-2.5">
                        <SeverityBadge severity={inc.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono text-muted-foreground">{inc.code}</div>
                          <div className="text-xs truncate">{inc.title}</div>
                        </div>
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ reusable section wrapper â”€â”€ */

function Section({ header, icon, children }: {
  header: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {icon}
        {header}
      </div>
      {children}
    </section>
  );
}

