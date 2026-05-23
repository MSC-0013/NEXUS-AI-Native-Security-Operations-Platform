import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  Filter,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Cloud,
  Bot,
  AtSign,
  FileCheck,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { formatDistanceToNow } from "date-fns";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NEXUS" },
      { name: "description", content: "Realtime notification center with severity grouping and read state." },
    ],
  }),
  component: NotificationsPage,
});

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type NotificationType =
  | "incident_mention"
  | "ai_recommendation"
  | "deployment_update"
  | "endpoint_alert"
  | "threat_intel"
  | "compliance_alert";

interface Notification {
  id: string;
  type: NotificationType;
  severity: Severity;
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  read: boolean;
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const NOW = new Date();

function ago(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "incident_mention", severity: "critical", title: "You were mentioned in INC-401", description: "@soc-lead assigned you to the LSASS credential dumping investigation on web-prod-12. Immediate review required — active exfiltration suspected.", timestamp: ago(0.5), source: "Incidents", read: false },
  { id: "n2", type: "endpoint_alert", severity: "critical", title: "EDR-2001 Critical alert on web-prod-12", description: "LSASS memory access detected via mimikatz-style syscall sequence. Host isolated, containment pending operator confirmation.", timestamp: ago(1), source: "EDR Falcon", read: false },
  { id: "n3", type: "threat_intel", severity: "high", title: "New IOC cluster matches your watchlist", description: "STIX bundle from CISA AA24-131A contains 14 indicators overlapping with your Asia-Pacific adversary profile. 3 hits in last 24h events.", timestamp: ago(2), source: "Threat Intel", read: false },
  { id: "n4", type: "ai_recommendation", severity: "high", title: "Copilot: Correlation across 3 incidents", description: "AI detected shared C2 infrastructure between INC-398, INC-400, and INC-401 — same Cobalt Strike team server (185.220.101.42). Recommending merger.", timestamp: ago(2.5), source: "NEXUS AI", read: false },
  { id: "n5", type: "compliance_alert", severity: "high", title: "SOC 2 control gap: MFA not enforced", description: "Okta policy audit found 23 privileged accounts bypassing MFA via remembered device exemption. Remediation deadline in 48h.", timestamp: ago(3), source: "Compliance", read: false },
  { id: "n6", type: "deployment_update", severity: "medium", title: "Zeek sensor v5.4.2 deployed to us-east-1", description: "Rolling deployment completed across 12 sensors. New JA3/JA3S fingerprinting rules active. No traffic disruption observed.", timestamp: ago(4), source: "Deployments", read: true },
  { id: "n7", type: "incident_mention", severity: "high", title: "Comment on INC-398 by @threat-hunter", description: "New YARA rule match against the Emotet dropper sample. Correlates with endpoint telemetry from finance-laptop-08. Your input requested.", timestamp: ago(5), source: "Incidents", read: false },
  { id: "n8", type: "endpoint_alert", severity: "medium", title: "Anomalous PowerShell on dc-prod-03", description: "Office process spawned powershell.exe with encoded command. EDR risk score 72/100. Sandbox analysis pending.", timestamp: ago(6), source: "EDR Falcon", read: true },
  { id: "n9", type: "ai_recommendation", severity: "medium", title: "Copilot: Tuning suggestion for DNS-77", description: "DGA detection rule has 34% false-positive rate this week. Suggesting threshold adjustment from 0.82 to 0.91 to reduce noise.", timestamp: ago(8), source: "NEXUS AI", read: true },
  { id: "n10", type: "threat_intel", severity: "info", title: "Sector threat landscape updated", description: "Financial services ISAC published Q2 threat briefing. Key findings: 40% increase in credential theft, novel MFA-bypass kits targeting Okta.", timestamp: ago(14), source: "Threat Intel", read: true },
  { id: "n11", type: "compliance_alert", severity: "medium", title: "PCI-DSS scan: 2 new findings", description: "Quarterly ASV scan flagged TLS 1.0 on payment-gateway-02 and unpatched OpenSSL on auth-proxy-05. SLA: 30 days.", timestamp: ago(18), source: "Compliance", read: true },
  { id: "n12", type: "deployment_update", severity: "info", title: "Correlation engine v3.2.0 released", description: "New release includes real-time enrichment pipeline, 2x throughput on event correlation, and updated MITRE ATT&CK mapping to v14.", timestamp: ago(22), source: "Deployments", read: true },
  { id: "n13", type: "incident_mention", severity: "critical", title: "Escalation: INC-400 requires your approval", description: "Auto-escalation triggered after 15 min without ack. Ransomware indicator on billing-srv-01. Approve containment or assign alternate.", timestamp: ago(26), source: "Incidents", read: false },
  { id: "n14", type: "endpoint_alert", severity: "high", title: "Brute force from 185.220.101.x", description: "1,400 failed auth attempts against Okta tenant in 30 minutes. Source IP block listed on AbuseIPDB. Geo: Russia.", timestamp: ago(30), source: "Okta", read: true },
  { id: "n15", type: "ai_recommendation", severity: "info", title: "Copilot: Weekly digest ready", description: "Summary: 8 incidents opened, 5 resolved. Mean time to contain improved 18%. Top MITRE technique: T1059.001 (PowerShell).", timestamp: ago(48), source: "NEXUS AI", read: true },
  { id: "n16", type: "compliance_alert", severity: "info", title: "Audit log export completed", description: "Monthly SOC 2 evidence package exported to S3 bucket compliance-evidence-us-east-1. 284k events, SHA-256 checksum verified.", timestamp: ago(52), source: "Compliance", read: true },
  { id: "n17", type: "threat_intel", severity: "medium", title: "Adversary profile updated: APT-41", description: "New TTPs added including supply-chain compromise via NuGet packages. Overlaps with your software-build environment. Review recommended.", timestamp: ago(72), source: "Threat Intel", read: true },
  { id: "n18", type: "deployment_update", severity: "healthy", title: "WAF ruleset v2024.06 deployed", description: "Updated OWASP Top 10 signatures and bot-management policies. Zero downtime blue-green deployment across all regions.", timestamp: ago(96), source: "Deployments", read: true },
  { id: "n19", type: "incident_mention", severity: "medium", title: "Resolution note added to INC-392", description: "@sec-ops-lead closed with root cause: stale service account credentials. Remediation: rotated 47 service accounts, enforced 90-day rotation.", timestamp: ago(120), source: "Incidents", read: true },
  { id: "n20", type: "endpoint_alert", severity: "info", title: "Sensor health check passed", description: "All 84 EDR sensors reporting healthy status. Last missed heartbeat: 0. Coverage: 100% across production and staging.", timestamp: ago(168), source: "EDR Falcon", read: true },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  incident_mention: AtSign,
  ai_recommendation: Bot,
  deployment_update: Cloud,
  endpoint_alert: Activity,
  threat_intel: ShieldAlert,
  compliance_alert: FileCheck,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  incident_mention: "Mention",
  ai_recommendation: "AI",
  deployment_update: "Deploy",
  endpoint_alert: "Endpoint",
  threat_intel: "Threat",
  compliance_alert: "Compliance",
};

type FilterKey = "all" | "unread" | "critical" | "mentions";

const FILTERS: { key: FilterKey; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All", icon: Bell },
  { key: "unread", label: "Unread", icon: Filter },
  { key: "critical", label: "Critical", icon: AlertTriangle },
  { key: "mentions", label: "Mentions", icon: AtSign },
];

type TimeGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

function timeGroup(date: Date): TimeGroup {
  const diffH = (NOW.getTime() - date.getTime()) / 3_600_000;
  if (diffH < 24) return "Today";
  if (diffH < 48) return "Yesterday";
  if (diffH < 168) return "This Week";
  return "Earlier";
}

const GROUP_ORDER: TimeGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "info", "healthy"];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "critical":
        return notifications.filter((n) => n.severity === "critical");
      case "mentions":
        return notifications.filter((n) => n.type === "incident_mention");
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, Notification[]>();
    for (const n of filtered) {
      const g = timeGroup(n.timestamp);
      const arr = map.get(g) ?? [];
      arr.push(n);
      map.set(g, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: (map.get(g) ?? []).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    }));
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, unread: 0, critical: 0, mentions: 0 };
    c.all = notifications.length;
    c.unread = notifications.filter((n) => !n.read).length;
    c.critical = notifications.filter((n) => n.severity === "critical").length;
    c.mentions = notifications.filter((n) => n.type === "incident_mention").length;
    return c;
  }, [notifications]);

  const severityGroups = useMemo(() => {
    const map = new Map<Severity, Notification[]>();
    for (const s of SEVERITY_ORDER) map.set(s, []);
    for (const n of notifications) map.get(n.severity)!.push(n);
    return SEVERITY_ORDER.map((s) => ({ severity: s, items: map.get(s)! }));
  }, [notifications]);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Operate / Notifications</div>
          <h1 className="text-2xl font-semibold tracking-tight">Notification Center</h1>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <Check className="size-3.5" />
          Mark all read
        </button>
      </div>

      {/* Layout: sidebar + list */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Priority filters */}
          <div className="rounded-lg border border-border bg-surface/60 p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground px-2 mb-2">Filters</div>
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeFilter === key
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{label}</span>
                <span className={cn(
                  "text-[11px] font-mono tabular-nums rounded-full px-1.5 py-0.5",
                  activeFilter === key ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground",
                )}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* Severity groups */}
          <div className="rounded-lg border border-border bg-surface/60 p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground px-2 mb-2">By severity</div>
            {severityGroups.map(({ severity, items }) => (
              <div key={severity} className="flex items-center justify-between px-2 py-1">
                <SeverityBadge severity={severity} />
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{items.length}</span>
              </div>
            ))}
          </div>

          {/* Unread indicator */}
          <div className="rounded-lg border border-border bg-surface/60 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Unread</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-primary">{counts.unread}</div>
          </div>
        </aside>

        {/* Notification list */}
        <div className="space-y-4">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="size-10 mb-3 opacity-40" />
              <div className="text-sm">No notifications match this filter.</div>
            </div>
          )}

          {grouped.map(({ group, items }) => (
            <section key={group}>
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2 flex items-center gap-2">
                <Shield className="size-3" />
                {group}
                <span className="ml-auto text-muted-foreground/60">{items.length}</span>
              </div>

              <div className="space-y-2">
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type];
                  const expanded = expandedId === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (expandedId === n.id) {
                          setExpandedId(null);
                        } else {
                          setExpandedId(n.id);
                          if (!n.read) markRead(n.id);
                        }
                      }}
                      className={cn(
                        "rounded-lg border bg-surface/60 cursor-pointer transition-colors hover:bg-surface/80",
                        n.read ? "border-border" : "border-l-2 border-l-primary border-border",
                      )}
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Icon */}
                        <div className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                          n.read ? "border-border bg-surface-2" : "border-primary/30 bg-primary/10",
                        )}>
                          <Icon className={cn("size-4", n.read ? "text-muted-foreground" : "text-primary")} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-sm leading-snug", n.read ? "font-normal text-foreground" : "font-semibold text-foreground")}>
                              {n.title}
                            </span>
                            <SeverityBadge severity={n.severity} />
                            <span className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider",
                              "border-border bg-surface-2 text-muted-foreground",
                            )}>
                              {TYPE_LABEL[n.type]}
                            </span>
                          </div>
                          <p className={cn(
                            "text-[13px] leading-relaxed",
                            expanded ? "text-foreground" : "text-muted-foreground line-clamp-1",
                          )}>
                            {n.description}
                          </p>
                          {expanded && (
                            <div className="pt-2 space-y-2">
                              <p className="text-[13px] leading-relaxed text-foreground/80">{n.description}</p>
                              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 border border-border">
                                  {n.source}
                                </span>
                                <span>{formatDistanceToNow(n.timestamp, { addSuffix: true })}</span>
                              </div>
                              {!n.read && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Check className="size-3" /> Mark read
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right side */}
                        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-mono text-muted-foreground">
                          <span>{formatDistanceToNow(n.timestamp, { addSuffix: true })}</span>
                          <span className="rounded bg-surface-2 border border-border px-1.5 py-0.5">{n.source}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
