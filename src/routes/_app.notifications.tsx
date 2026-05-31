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
import {
  useApiNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/api-hooks";

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

const NOW = new Date();

function mapApiType(type: string): NotificationType {
  if (type.includes("incident") || type.includes("mention")) return "incident_mention";
  if (type.includes("ai") || type.includes("copilot")) return "ai_recommendation";
  if (type.includes("deploy")) return "deployment_update";
  if (type.includes("endpoint") || type.includes("edr")) return "endpoint_alert";
  if (type.includes("threat") || type.includes("ioc")) return "threat_intel";
  if (type.includes("compliance")) return "compliance_alert";
  return "incident_mention";
}

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
  const { data, isLoading } = useApiNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications: Notification[] = useMemo(
    () =>
      (data?.items ?? []).map((n) => ({
        id: n.id,
        type: mapApiType(n.type),
        severity: n.severity as Severity,
        title: n.title,
        description: n.body ?? "",
        timestamp: new Date(n.createdAt),
        source: n.type,
        read: n.isRead,
      })),
    [data?.items],
  );
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

  function onMarkRead(id: string) {
    markRead.mutate(id);
  }

  function onMarkAllRead() {
    markAllRead.mutate();
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
          onClick={onMarkAllRead}
          disabled={markAllRead.isPending}
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
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="text-sm">Loading notifications…</div>
            </div>
          )}
          {!isLoading && grouped.length === 0 && (
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
                          if (!n.read) onMarkRead(n.id);
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
                                  onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
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
