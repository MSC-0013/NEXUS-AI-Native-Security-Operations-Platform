import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, BookOpen, Clock, User, Bot, Link, TriangleAlert as AlertTriangle, Shield, ChevronRight, Eye, Pencil, MessageSquare, Terminal, Globe, Lock, FingerprintPattern as Fingerprint, Plus, Trash2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { MetricCard } from "@/components/metric-card";
import { formatDistanceToNow } from "date-fns";
import { useInvestigations, useIncidents, useCreateInvestigation, useUpdateInvestigation, useDeleteInvestigation, useInvestigationNotes, useAddInvestigationNote } from "@/lib/api-hooks";
import type { SeverityLevel as Severity } from "@nexus/shared";

export const Route = createFileRoute("/_app/investigations")({
  head: () => ({
    meta: [
      { title: "Investigations â€” NEXUS" },
      { name: "description", content: "SOC investigation workspace with notebooks, evidence timelines, and AI summaries." },
    ],
  }),
  component: InvestigationsPage,
});

/* â”€â”€ types â”€â”€ */

type InvStatus = "active" | "suspended" | "closed";

interface Investigation {
  id: string; code: string; title: string; status: InvStatus; severity: Severity;
  assignee: string; createdAt: string; updatedAt: string;
  linkedIncidents: { code: string; title: string; severity: Severity }[];
  linkedAlerts: number; notes: string;
  logEntries: { timestamp: string; level: "info"|"warn"|"error"|"critical"; source: string; message: string; fields: Record<string,string> }[];
  evidence: { at: string; actor: string; action: string; detail: string; icon: "shield"|"eye"|"link"|"terminal"|"lock"|"globe" }[];
  aiSummary: string;
  collaborativeNotes: { id: string; author: string; at: string; body: string }[];
  endpoints: { hostname: string; os: string; risk: number; lastSeen: string; indicators: string[] }[];
}

/* â”€â”€ constants â”€â”€ */

const STATUS_STYLE: Record<InvStatus, string> = {
  active: "bg-critical/15 text-critical border-critical/40",
  suspended: "bg-medium/15 text-medium border-medium/40",
  closed: "bg-healthy/15 text-healthy border-healthy/40",
};

const LEVEL_STYLE = { info: "text-info", warn: "text-medium", error: "text-high", critical: "text-critical" };
const EV_ICON = { shield: Shield, eye: Eye, link: Link, terminal: Terminal, lock: Lock, globe: Globe };

const d = (days: number) => new Date(Date.now() - 86400000 * days).toISOString();
const h = (hours: number) => new Date(Date.now() - 3600000 * hours).toISOString();

const INVESTIGATIONS: Investigation[] = [
  {
    id: "inv-1", code: "INV-4001", title: "Ransomware lateral movement via RDP brute-force",
    status: "active", severity: "critical", assignee: "amelia.lee", createdAt: d(2), updatedAt: h(1),
    linkedIncidents: [
      { code: "INC-1003", title: "LSASS dump attempt on finance workstation", severity: "critical" },
      { code: "INC-1011", title: "C2 beaconing detected from build agent", severity: "high" },
    ],
    linkedAlerts: 14,
    notes: "## Findings\n\nInitial access via **compromised VPN credential** obtained through credential stuffing.\n\n### Lateral movement\n- RDP brute-force from `edge-proxy-07` to internal subnet 10.0.4.0/24\n- Pass-the-hash observed on `win-finance-08`\n- Scheduled task creation on `db-mssql-03`\n\n### IOCs\n| Indicator | Type |\n|-----------|------|\n| 185.234.72.11 | IP |\n| update.svc-cloud.xyz | Domain |\n| a3f8d...e21c | SHA256 |",
    logEntries: [
      { timestamp: "2026-05-23T08:12:01Z", level: "critical", source: "edr-falconlite", message: "LSASS memory access by non-system binary", fields: { host: "win-finance-08", pid: "4812", image: "mimikatz.exe" } },
      { timestamp: "2026-05-23T08:11:34Z", level: "error", source: "suricata", message: "RDP brute-force attempt from 10.0.1.55", fields: { dest: "10.0.4.22", attempts: "342", window: "12m" } },
      { timestamp: "2026-05-23T07:58:12Z", level: "warn", source: "okta", message: "Anomalous login geo for svc-vpn-prod", fields: { country: "KP", asn: "AS131279" } },
      { timestamp: "2026-05-23T07:55:00Z", level: "info", source: "aws-cloudtrail", message: "AssumeRole call by svc-vpn-prod", fields: { role: "arn:aws:iam::prod/ReadOnly", region: "us-east-1" } },
    ],
    evidence: [
      { at: "2026-05-23T08:12:01Z", actor: "edr-falconlite", action: "Detected credential dump", detail: "LSASS access by mimikatz.exe on win-finance-08", icon: "shield" },
      { at: "2026-05-23T08:11:34Z", actor: "nexus-ai", action: "Correlated RDP brute-force with VPN auth", detail: "342 failed attempts in 12 min from compromised edge-proxy-07", icon: "link" },
      { at: "2026-05-23T07:58:12Z", actor: "siem-correlator", action: "Flagged impossible travel", detail: "VPN login from KP 14 min after on-prem badge swipe in NYC", icon: "eye" },
      { at: "2026-05-23T07:55:00Z", actor: "amelia.lee", action: "Isolated edge-proxy-07", detail: "Applied containment policy via EDR", icon: "lock" },
      { at: "2026-05-23T07:40:00Z", actor: "edr-falconlite", action: "Blocked scheduled task creation", detail: "schtasks /create on db-mssql-03 referencing update.svc-cloud.xyz", icon: "terminal" },
    ],
    aiSummary: "NEXUS AI assessment: High-confidence intrusion campaign leveraging compromised VPN credentials for initial access, followed by RDP brute-force lateral movement and credential harvesting. TTPs align with FIN7 / Carbanak overlap. Recommend immediate credential rotation for all svc-* accounts, network segmentation of 10.0.4.0/24, and deployment of canary tokens on high-value file shares. Estimated scope: 4 hosts compromised, 2 identities affected.",
    collaborativeNotes: [
      { id: "cn-1", author: "amelia.lee", at: "2026-05-23T08:15:00Z", body: "Confirmed lateral movement pattern matches FIN7 TTPs. Isolating affected subnet now." },
      { id: "cn-2", author: "j.okafor", at: "2026-05-23T08:20:00Z", body: "Threat intel confirms 185.234.72.11 as FIN7 C2 since March. Cross-referencing with historical logs." },
      { id: "cn-3", author: "nexus-ai", at: "2026-05-23T08:25:00Z", body: "Automated correlation complete. 3 additional endpoints show beaconing to same C2 domain. Adding to linked assets." },
    ],
    endpoints: [
      { hostname: "win-finance-08", os: "Windows 11", risk: 94, lastSeen: "2m ago", indicators: ["LSASS dump", "mimikatz.exe", "C2 beacon"] },
      { hostname: "edge-proxy-07", os: "Ubuntu 22.04", risk: 87, lastSeen: "4m ago", indicators: ["RDP brute-force source", "compromised VPN"] },
      { hostname: "db-mssql-03", os: "Windows Server 2022", risk: 71, lastSeen: "8m ago", indicators: ["schtasks creation", "C2 domain ref"] },
      { hostname: "k8s-node-prod-09", os: "Bottlerocket", risk: 42, lastSeen: "1m ago", indicators: ["suspicious API call"] },
    ],
  },
  {
    id: "inv-2", code: "INV-4002", title: "Cloud IAM privilege escalation via wildcard policy",
    status: "active", severity: "high", assignee: "h.tanaka", createdAt: d(1), updatedAt: h(2),
    linkedIncidents: [{ code: "INC-1015", title: "Privileged IAM role attached outside change window", severity: "high" }],
    linkedAlerts: 7,
    notes: "## Summary\n\nWildcard IAM policy `*:*` attached to `svc-deploy-bot` outside approved change window.\n\n**Timeline**: Policy created at 03:14 UTC by API key `AKIA...F4E2`. No corresponding Terraform PR found.",
    logEntries: [
      { timestamp: "2026-05-23T03:14:22Z", level: "error", source: "aws-cloudtrail", message: "AttachUserPolicy â€” wildcard granted", fields: { user: "svc-deploy-bot", policy: "arn:aws:iam::policy/AdminFullAccess" } },
      { timestamp: "2026-05-23T03:12:01Z", level: "warn", source: "okta", message: "API key authentication from new ASN", fields: { key: "AKIA...F4E2", asn: "AS134023" } },
    ],
    evidence: [
      { at: "2026-05-23T03:14:22Z", actor: "aws-cloudtrail", action: "Detected wildcard policy attachment", detail: "AdminFullAccess attached to svc-deploy-bot", icon: "shield" },
      { at: "2026-05-23T03:12:01Z", actor: "nexus-ai", action: "Flagged API key from unknown ASN", detail: "AKIA...F4E2 from AS134023 â€” no prior history", icon: "eye" },
    ],
    aiSummary: "NEXUS AI assessment: API key authentication from an unrecognized ASN followed by privilege escalation within 2 minutes suggests compromised key. Recommend immediate key revocation and audit of all actions performed by svc-deploy-bot in the last 24h.",
    collaborativeNotes: [{ id: "cn-4", author: "h.tanaka", at: "2026-05-23T04:00:00Z", body: "Key revoked. Scanning for other resources modified by this key." }],
    endpoints: [{ hostname: "build-runner-44", os: "Debian 12", risk: 65, lastSeen: "15m ago", indicators: ["API key exposure", "unusual deploy"] }],
  },
  {
    id: "inv-3", code: "INV-4003", title: "Data exfiltration from EU analytics cluster",
    status: "active", severity: "high", assignee: "marco.cruz", createdAt: d(3), updatedAt: h(4),
    linkedIncidents: [{ code: "INC-1018", title: "Anomalous data egress from EU analytics cluster", severity: "high" }],
    linkedAlerts: 9,
    notes: "## Data exfil investigation\n\n4.2 GB outbound to `storage.blob.core.windows.net` over 6 hours.\n\n**Source**: `analytics-etl-03.eu-west`\n**User**: `svc-etl-pipeline`",
    logEntries: [{ timestamp: "2026-05-22T22:01:00Z", level: "warn", source: "zeek", message: "Large outbound transfer detected", fields: { src: "10.2.8.14", dst: "20.54.121.11", bytes: "4.2GB" } }],
    evidence: [
      { at: "2026-05-22T22:01:00Z", actor: "zeek", action: "Flagged large data transfer", detail: "4.2 GB egress from analytics-etl-03 over 6h to Azure blob", icon: "globe" },
      { at: "2026-05-22T18:00:00Z", actor: "marco.cruz", action: "Initiated investigation", detail: "Exfil alert triaged and escalated", icon: "eye" },
    ],
    aiSummary: "NEXUS AI assessment: Data volume and timing inconsistent with normal ETL pipeline activity. Destination is an unmonitored Azure subscription. Possible insider threat or compromised service principal.",
    collaborativeNotes: [],
    endpoints: [{ hostname: "analytics-etl-03.eu-west", os: "Ubuntu 22.04", risk: 72, lastSeen: "5m ago", indicators: ["large egress", "unusual dest"] }],
  },
  {
    id: "inv-4", code: "INV-4004", title: "C2 beaconing from build agent via DNS tunneling",
    status: "suspended", severity: "high", assignee: "j.okafor", createdAt: d(5), updatedAt: d(1),
    linkedIncidents: [{ code: "INC-1011", title: "C2 beaconing detected from build agent", severity: "high" }],
    linkedAlerts: 5,
    notes: "Suspended â€” endpoint isolated, beaconing stopped. Awaiting forensic disk image analysis.",
    logEntries: [{ timestamp: "2026-05-20T14:32:11Z", level: "error", source: "suricata", message: "DGA-like DNS query pattern", fields: { host: "build-runner-44", domain: "xk9d.svc-upd.xyz" } }],
    evidence: [
      { at: "2026-05-20T14:32:11Z", actor: "suricata", action: "Detected DNS tunneling", detail: "High-entropy subdomain queries at 60s intervals", icon: "terminal" },
      { at: "2026-05-20T15:00:00Z", actor: "j.okafor", action: "Isolated build-runner-44", detail: "EDR containment applied, DNS sinkhole configured", icon: "lock" },
    ],
    aiSummary: "NEXUS AI assessment: DNS tunneling C2 with 60s beacon interval. Domain generation algorithm matches known Cobalt Strike DNS beacon profile. Endpoint isolated â€” awaiting forensic analysis before closure.",
    collaborativeNotes: [{ id: "cn-5", author: "j.okafor", at: "2026-05-21T09:00:00Z", body: "Disk image shipped to forensics. Expecting results by EOD Monday." }],
    endpoints: [{ hostname: "build-runner-44", os: "Debian 12", risk: 55, lastSeen: "1d ago", indicators: ["DNS tunnel", "Cobalt Strike beacon"] }],
  },
  {
    id: "inv-5", code: "INV-4005", title: "Credential stuffing campaign against Okta tenant",
    status: "closed", severity: "medium", assignee: "n.patel", createdAt: d(7), updatedAt: d(2),
    linkedIncidents: [{ code: "INC-1002", title: "Credential stuffing campaign against Okta tenant", severity: "medium" }],
    linkedAlerts: 3,
    notes: "Resolved â€” MFA enforced org-wide, compromised accounts reset, IP blocklist updated.",
    logEntries: [{ timestamp: "2026-05-18T12:05:00Z", level: "warn", source: "okta", message: "Bulk failed logins from proxy IPs", fields: { targeted_users: "38", source_asns: "AS134023, AS42334" } }],
    evidence: [
      { at: "2026-05-18T12:05:00Z", actor: "okta", action: "Detected credential stuffing", detail: "38 targeted users, 2 proxy ASNs", icon: "shield" },
      { at: "2026-05-18T14:00:00Z", actor: "n.patel", action: "Enforced MFA org-wide", detail: "FIDO2 required for all admin+privileged roles", icon: "lock" },
    ],
    aiSummary: "NEXUS AI assessment: Credential stuffing successfully mitigated. MFA enforcement and IP blocklist have eliminated the attack vector. No evidence of account takeover. Closed.",
    collaborativeNotes: [{ id: "cn-6", author: "n.patel", at: "2026-05-19T10:00:00Z", body: "All compromised accounts reset. MFA adoption at 100%. Closing." }],
    endpoints: [],
  },
  {
    id: "inv-6", code: "INV-4006", title: "Impossible travel for executive account",
    status: "active", severity: "medium", assignee: "s.ivanov", createdAt: d(0.5), updatedAt: h(0.5),
    linkedIncidents: [], linkedAlerts: 2,
    notes: "## Ongoing\n\nExecutive `c.eo` logged in from NYC and Lagos within 9 minutes. Verifying with physical security.",
    logEntries: [{ timestamp: "2026-05-23T09:30:00Z", level: "warn", source: "okta", message: "Impossible travel detected", fields: { user: "c.eo", loc1: "NYC", loc2: "Lagos", delta: "9m" } }],
    evidence: [{ at: "2026-05-23T09:30:00Z", actor: "okta", action: "Flagged impossible travel", detail: "c.eo authenticated from NYC and Lagos within 9 min", icon: "eye" }],
    aiSummary: "NEXUS AI assessment: Impossible travel alert for executive account. Awaiting verification from physical security. Session tokens for the Lagos login have been pre-emptively revoked.",
    collaborativeNotes: [], endpoints: [],
  },
  {
    id: "inv-7", code: "INV-4007", title: "K8s API audit anomaly in payments namespace",
    status: "suspended", severity: "medium", assignee: "h.tanaka", createdAt: d(4), updatedAt: h(12),
    linkedIncidents: [{ code: "INC-1020", title: "Kubernetes API audit anomaly in payments namespace", severity: "medium" }],
    linkedAlerts: 4,
    notes: "Suspended â€” privileged container deployment traced to CI pipeline misconfiguration. Fix deployed, monitoring for recurrence.",
    logEntries: [{ timestamp: "2026-05-21T16:44:00Z", level: "warn", source: "k8s-audit", message: "Privileged container in payments namespace", fields: { pod: "pay-gateway-7b8f", image: "pay-svc:v2.4.1" } }],
    evidence: [
      { at: "2026-05-21T16:44:00Z", actor: "k8s-audit", action: "Flagged privileged container", detail: "pay-gateway-7b8f running as privileged in payments ns", icon: "terminal" },
      { at: "2026-05-21T17:30:00Z", actor: "h.tanaka", action: "Traced to CI misconfiguration", detail: "Dockerfile lacked securityContext â€” fix deployed", icon: "link" },
    ],
    aiSummary: "NEXUS AI assessment: Privileged container was a CI misconfiguration, not malicious. Fix deployed and Helm chart updated. Monitoring for 48h before closure.",
    collaborativeNotes: [],
    endpoints: [{ hostname: "k8s-node-prod-09", os: "Bottlerocket", risk: 28, lastSeen: "1m ago", indicators: ["privileged container"] }],
  },
  {
    id: "inv-8", code: "INV-4008", title: "SQL injection probes on customer portal",
    status: "closed", severity: "info", assignee: "amelia.lee", createdAt: d(6), updatedAt: d(3),
    linkedIncidents: [], linkedAlerts: 1,
    notes: "Closed â€” WAF rule updated, probes blocked. No data exfiltration confirmed.",
    logEntries: [{ timestamp: "2026-05-19T11:22:00Z", level: "info", source: "suricata", message: "SQL injection probe blocked by WAF", fields: { path: "/api/v2/users?id=", payload: "' OR 1=1--" } }],
    evidence: [{ at: "2026-05-19T11:22:00Z", actor: "suricata", action: "Blocked SQLi probe", detail: "WAF rule matched on /api/v2/users", icon: "shield" }],
    aiSummary: "NEXUS AI assessment: Automated SQL injection probes from known scanner IP. WAF rules updated to block pattern. No successful exploitation observed. Closed.",
    collaborativeNotes: [], endpoints: [],
  },
];

/* â”€â”€ component â”€â”€ */

function InvestigationsPage() {
  const { data: invData, isLoading } = useInvestigations();
  const { data: incidentsData } = useIncidents({ limit: 100 });
  const alertCount = incidentsData?.items?.length ?? 0;
  const investigationsList: Investigation[] = useMemo(() => {
    const items = invData?.items ?? [];
    if (items.length === 0) return INVESTIGATIONS;
    return items.map((inv, idx) => ({
      id: inv.id,
      code: `INV-${String(idx + 1).padStart(4, "0")}`,
      title: inv.title,
      status: "active" as InvStatus,
      severity: "high" as Severity,
      assignee: "soc",
      createdAt: inv.updatedAt,
      updatedAt: inv.updatedAt,
      linkedIncidents: [],
      linkedAlerts: Math.max(1, Math.floor(alertCount / Math.max(items.length, 1))),
      notes: inv.content ?? "",
      logEntries: [],
      evidence: [],
      aiSummary: inv.content ?? "Investigation from API.",
      collaborativeNotes: [],
      endpoints: [],
    }));
  }, [invData, alertCount]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveId = selectedId ?? investigationsList[0]?.id ?? "";
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("preview");
  const sel = investigationsList.find((i) => i.id === effectiveId) ?? investigationsList[0];

  /* â”€â”€ CRUD hooks â”€â”€ */
  const createInv = useCreateInvestigation();
  const updateInv = useUpdateInvestigation();
  const deleteInv = useDeleteInvestigation();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [notesContent, setNotesContent] = useState(investigationsList[0]?.notes ?? "");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  /* ── collaborative notes (DB-backed) ── */
  const isApiInvestigation = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(effectiveId);
  const { data: notesData } = useInvestigationNotes(isApiInvestigation ? effectiveId : undefined);
  const addNoteMut = useAddInvestigationNote();
  const [newNote, setNewNote] = useState("");

  const handleAddNote = () => {
    if (!newNote.trim() || !isApiInvestigation) return;
    addNoteMut.mutate(
      { investigationId: effectiveId, body: newNote.trim() },
      { onSuccess: () => setNewNote("") },
    );
  };

  useEffect(() => {
    setNotesContent(
      investigationsList.find((i) => i.id === effectiveId)?.notes ?? ""
    );
  }, [effectiveId]);

  const handleSaveNotes = () => {
    if (!sel) return;
    updateInv.mutate({ id: sel.id, content: notesContent });
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createInv.mutate(
      { title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle("");
          setShowNewDialog(false);
        },
      }
    );
  };

  const activeCt = investigationsList.filter((i) => i.status === "active").length;
  const suspendedCt = investigationsList.filter((i) => i.status === "suspended").length;
  const closedCt = investigationsList.filter((i) => i.status === "closed").length;
  const totalAlerts = alertCount || investigationsList.reduce((s, i) => s + i.linkedAlerts, 0);

  if (!sel) {
    return <div className="p-12 text-center text-muted-foreground">{isLoading ? "Loadingâ€¦" : "No investigations."}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* left panel â€” list */}
      <div className="w-full lg:w-[380px] lg:min-w-[380px] border-r border-border bg-surface/40 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Response / Investigations</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Investigations</h1>
            <button
              onClick={() => setShowNewDialog(true)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="size-3" /> New
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            <MetricCard label="Active" value={activeCt} icon={FileSearch} tone="critical" />
            <MetricCard label="Suspended" value={suspendedCt} icon={Clock} tone="info" />
            <MetricCard label="Closed" value={closedCt} icon={Shield} tone="healthy" />
            <MetricCard label="Alerts" value={totalAlerts} icon={AlertTriangle} tone="high" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {investigationsList.map((inv) => (
            <div key={inv.id}
              className={cn("relative border-b border-border/60 transition-colors group",
                effectiveId === inv.id ? "bg-surface-2/80 border-l-2 border-l-primary" : "hover:bg-surface-2/40",
              )}>
              <button onClick={() => setSelectedId(inv.id)} className="w-full text-left px-4 py-3 pr-10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{inv.code}</span>
                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono", STATUS_STYLE[inv.status])}>{inv.status}</span>
                  </div>
                  <div className="text-sm font-medium leading-snug truncate">{inv.title}</div>
                </div>
                <SeverityBadge severity={inv.severity} className="shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                <span className="inline-flex items-center gap-1"><User className="size-3" />{inv.assignee}</span>
                <span className="inline-flex items-center gap-1"><Link className="size-3" />{inv.linkedIncidents.length} inc</span>
                <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3" />{inv.linkedAlerts} alerts</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">
                Created {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
              </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${inv.title}"?`)) deleteInv.mutate(inv.id); }}
                className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center size-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete investigation"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* right panel â€” detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
          {/* header */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              <BookOpen className="size-3" />
              {sel.code}
              <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono", STATUS_STYLE[sel.status])}>{sel.status}</span>
              <SeverityBadge severity={sel.severity} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{sel.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1"><User className="size-3" />{sel.assignee}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Created {formatDistanceToNow(new Date(sel.createdAt), { addSuffix: true })}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Updated {formatDistanceToNow(new Date(sel.updatedAt), { addSuffix: true })}</span>
              <span className="inline-flex items-center gap-1"><Link className="size-3" />{sel.linkedIncidents.length} linked incidents</span>
              <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3" />{sel.linkedAlerts} linked alerts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            {/* main column */}
            <div className="space-y-5">
              {/* notebook */}
              <Section header="Investigation Notebook" headerRight={
                <div className="flex items-center gap-2">
                  {previewMode === "edit" && (
                    <button
                      onClick={handleSaveNotes}
                      disabled={updateInv.isPending}
                      className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                    >
                      <Save className="size-3" />
                      {updateInv.isPending ? "Savingâ€¦" : "Save"}
                    </button>
                  )}
                  <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
                    {(["edit", "preview"] as const).map((m) => (
                      <button key={m} onClick={() => setPreviewMode(m)}
                        className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider",
                          previewMode === m ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}>
                        {m === "edit" ? <Pencil className="size-3" /> : <Eye className="size-3" />} {m}
                      </button>
                    ))}
                  </div>
                </div>
              }>
                {previewMode === "edit" ? (
                  <textarea
                    ref={notesRef}
                    value={notesContent}
                    onChange={(e) => setNotesContent(e.target.value)}
                    className="w-full min-h-[200px] bg-transparent p-4 text-sm font-mono leading-relaxed outline-none resize-y placeholder:text-muted-foreground"
                    placeholder="Write investigation notes in markdown..." />
                ) : (
                  <div className="p-4 text-sm leading-relaxed"><MarkdownPreview text={sel.notes} /></div>
                )}
              </Section>

              {/* structured logs */}
              <Section header="Structured Log Entries">
                <div className="divide-y divide-border/50">
                  {sel.logEntries.map((log, idx) => (
                    <div key={idx} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-mono uppercase font-semibold", LEVEL_STYLE[log.level])}>{log.level}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{log.timestamp}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/70">{log.source}</span>
                      </div>
                      <div className="text-sm">{log.message}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {Object.entries(log.fields).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono text-muted-foreground">
                            <span className="text-muted-foreground/60">{k}=</span><span className="text-foreground/70">{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* evidence timeline */}
              <Section header="Evidence Timeline">
                <div className="relative px-4 py-3">
                  <div className="absolute left-[27px] top-3 bottom-3 w-px bg-border" />
                  {sel.evidence.map((ev, idx) => {
                    const Ic = EV_ICON[ev.icon];
                    return (
                      <div key={idx} className="relative flex items-start gap-3 pb-4 last:pb-0">
                        <div className="relative z-10 flex items-center justify-center size-7 rounded-full border border-border bg-surface-2 shrink-0">
                          <Ic className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{ev.action}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{formatDistanceToNow(new Date(ev.at), { addSuffix: true })}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{ev.detail}</div>
                          <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{ev.actor}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* endpoint correlation */}
              {sel.endpoints.length > 0 && (
                <Section header="Endpoint Correlation">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Host</th>
                        <th className="px-4 py-2 font-medium">OS</th>
                        <th className="px-4 py-2 font-medium">Risk</th>
                        <th className="px-4 py-2 font-medium">Last Seen</th>
                        <th className="px-4 py-2 font-medium">Indicators</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {sel.endpoints.map((ep) => (
                        <tr key={ep.hostname} className="hover:bg-surface-2/40">
                          <td className="px-4 py-2.5 font-mono text-xs">{ep.hostname}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{ep.os}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("text-xs font-mono font-semibold",
                              ep.risk >= 80 ? "text-critical" : ep.risk >= 60 ? "text-high" : ep.risk >= 40 ? "text-medium" : "text-info")}>
                              {ep.risk}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground">{ep.lastSeen}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {ep.indicators.map((ind) => (
                                <span key={ind} className="inline-flex rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">{ind}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}
            </div>

            {/* sidebar column */}
            <div className="space-y-5">
              {/* AI summary */}
              <section className="rounded-lg border border-border bg-surface/60">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <Bot className="size-3.5 text-info" /> AI Investigation Summary
                </div>
                <div className="p-4 text-sm leading-relaxed text-foreground/90">{sel.aiSummary}</div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <Fingerprint className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground">NEXUS AI v2.4 â€” confidence: high</span>
                </div>
              </section>

              {/* linked incidents */}
              <section className="rounded-lg border border-border bg-surface/60">
                <div className="px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Linked Incidents</div>
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

              {/* collaborative notes */}
              <section className="rounded-lg border border-border bg-surface/60">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="size-3.5" /> Collaborative Notes
                </div>
                {(() => {
                  const apiNotes = notesData?.items ?? [];
                  const notes = isApiInvestigation
                    ? apiNotes
                    : sel.collaborativeNotes.map((n) => ({ id: n.id, author: n.author, at: n.at, body: n.body }));
                  if (notes.length === 0) {
                    return <div className="px-4 py-4 text-[11px] text-muted-foreground">No notes yet</div>;
                  }
                  return (
                    <div className="divide-y divide-border/50">
                      {notes.map((n) => (
                        <div key={n.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono font-medium text-foreground">{n.author}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{formatDistanceToNow(new Date(n.at), { addSuffix: true })}</span>
                            {n.author === "nexus-ai" && (
                              <span className="inline-flex items-center gap-1 rounded border border-info/30 bg-info/10 px-1 py-0.5 text-[9px] font-mono text-info">
                                <Bot className="size-2.5" />AI
                              </span>
                            )}
                          </div>
                          <div className="text-xs leading-relaxed text-foreground/80">{n.body}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                      disabled={!isApiInvestigation || addNoteMut.isPending}
                      placeholder={isApiInvestigation ? "Add a note..." : "Select a saved investigation to add notes"}
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!isApiInvestigation || !newNote.trim() || addNoteMut.isPending}
                      className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      {addNoteMut.isPending ? "Posting…" : "Post"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {/* New Investigation Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">New Investigation</h3>
              <button onClick={() => setShowNewDialog(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">Title</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewDialog(false); }}
              placeholder="e.g. Suspicious lateral movement from DC01"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNewDialog(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createInv.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-mono text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createInv.isPending ? "Creatingâ€¦" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€ reusable section wrapper â”€â”€ */

function Section({ header, headerRight, children }: {
  header: string; headerRight?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{header}</div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

/* â”€â”€ mini markdown renderer â”€â”€ */

function MarkdownPreview({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (t.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{t.slice(4)}</h3>;
        if (t.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-4 mb-1">{t.slice(3)}</h2>;
        if (t.startsWith("| ")) return <MdRow key={i} text={t} />;
        if (t.startsWith("- ")) return <div key={i} className="flex gap-2 pl-2"><span className="text-muted-foreground mt-px">-</span><span>{inlineMd(t.slice(2))}</span></div>;
        return <p key={i} className="leading-relaxed">{inlineMd(t)}</p>;
      })}
    </div>
  );
}

function MdRow({ text }: { text: string }) {
  const cells = text.split("|").filter((c) => c.trim());
  if (cells.every((c) => c.trim().match(/^-+$/))) return null;
  return (
    <div className="flex gap-2 text-[11px] font-mono py-0.5 pl-4">
      {cells.map((c, i) => <span key={i} className={cn("flex-1", i === 0 ? "text-foreground" : "text-muted-foreground")}>{c.trim()}</span>)}
    </div>
  );
}

function inlineMd(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono">{p.slice(1, -1)}</code>;
    return p;
  });
}

