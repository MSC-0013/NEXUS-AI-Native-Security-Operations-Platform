import { createFileRoute } from "@tanstack/react-router";
import { User, Shield, Key, Monitor, Smartphone, Globe, Bell, Clock, Building2, Lock, Trash2, ExternalLink, Activity, Webhook, Mail, MessageSquare, Hash, CircleCheck as CheckCircle2, Circle as XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { ROLE_LABEL, ROLE_PERMISSIONS, type Role, type Permission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [{ title: "Profile — NEXUS" }],
  }),
  component: ProfilePage,
});

/* ---------- mock data ---------- */

const ORGS = [
  { name: "Acme Federal", role: "Owner", members: 218, status: "active" },
  { name: "DoE Sector", role: "Security Admin", members: 54, status: "active" },
  { name: "Partner Sandbox", role: "Viewer", members: 12, status: "invited" },
];

const SESSIONS = [
  { browser: "Chrome 124", ip: "10.4.22.18", location: "New York, US", lastActive: "Now", current: true },
  { browser: "Firefox 126", ip: "203.0.113.42", location: "Singapore, SG", lastActive: "2h ago", current: false },
  { browser: "Safari 17", ip: "192.0.2.55", location: "Mumbai, IN", lastActive: "1d ago", current: false },
  { browser: "Edge 124", ip: "198.51.100.7", location: "London, UK", lastActive: "3d ago", current: false },
];

const DEVICES = [
  { name: "MacBook Pro 16\"", os: "macOS 14.5", lastSeen: "Now", status: "trusted" },
  { name: "ThinkPad X1 Carbon", os: "Windows 11", lastSeen: "2h ago", status: "trusted" },
  { name: "iPhone 15 Pro", os: "iOS 17.5", lastSeen: "1d ago", status: "managed" },
  { name: "Pixel 8", os: "Android 14", lastSeen: "14d ago", status: "unknown" },
];

const OAUTH_PROVIDERS = [
  { name: "Google", connected: true, email: "k.morgan@acme.io", icon: Globe },
  { name: "GitHub", connected: true, email: "kmorgan", icon: ExternalLink },
  { name: "Okta", connected: true, email: "k.morgan@acme.io", icon: Lock },
];

const API_TOKENS = [
  { name: "terraform-provider", created: "2025-11-08", lastUsed: "1h ago", prefix: "nxs_a8f2…" },
  { name: "ci-pipeline-deploy", created: "2026-01-22", lastUsed: "6h ago", prefix: "nxs_3c91…" },
  { name: "grafana-datasource", created: "2026-03-14", lastUsed: "2d ago", prefix: "nxs_e7d4…" },
  { name: "dev-personal-key", created: "2026-04-01", lastUsed: "12d ago", prefix: "nxs_0b5a…" },
];

const TIMELINE = [
  { action: "Logged in from new device", detail: "MacBook Pro — New York, US", time: "2m ago", tone: "info" },
  { action: "Role changed to Security Admin", detail: "by root@acme.io", time: "3h ago", tone: "high" },
  { action: "API token rotated", detail: "ci-pipeline-deploy", time: "6h ago", tone: "medium" },
  { action: "MFA enrollment completed", detail: "WebAuthn — YubiKey 5C", time: "1d ago", tone: "healthy" },
  { action: "Session revoked", detail: "Safari 17 — Mumbai, IN", time: "2d ago", tone: "critical" },
  { action: "Joined organization DoE Sector", detail: "Invited by admin@doe.gov", time: "5d ago", tone: "info" },
];

const AUDIT_SUMMARY = [
  { label: "Actions (7d)", value: "142" },
  { label: "Login events", value: "38" },
  { label: "Config changes", value: "12" },
  { label: "Failed attempts", value: "3" },
  { label: "Privilege escalations", value: "1" },
];

/* ---------- section header ---------- */

function SectionHeader({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <h3 className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{children}</h3>
    </div>
  );
}

/* ---------- main component ---------- */

function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-sm">
        No active session
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const permissions = ROLE_PERMISSIONS[user.role];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Account</p>
          <h1 className="text-xl font-semibold text-foreground">Profile &amp; Security</h1>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
          {user.id.slice(0, 8)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN (2/3) ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <div className="flex items-start gap-5">
              {/* avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xl font-mono">
                {initials}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-lg font-semibold text-foreground truncate">{user.name}</h2>
                <p className="text-sm text-muted-foreground font-mono truncate">{user.email}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge className="bg-primary/15 text-primary border-primary/30">{ROLE_LABEL[user.role]}</Badge>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    <Shield className="mr-1 h-3 w-3" />
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Workspace</p>
                <p className="text-sm font-medium text-foreground">{user.workspace}</p>
              </div>
            </div>
          </div>

          {/* Organization memberships */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Building2}>Organization Memberships</SectionHeader>
            <div className="space-y-3">
              {ORGS.map((org) => (
                <div
                  key={org.name}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{org.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{org.role} &middot; {org.members} members</p>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px] font-mono",
                      org.status === "active"
                        ? "bg-healthy/15 text-healthy border-healthy/30"
                        : "bg-high/15 text-high border-high/30",
                    )}
                  >
                    {org.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions overview */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Key}>RBAC Permissions</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  "view:dashboard",
                  "view:events",
                  "view:incidents",
                  "act:incidents",
                  "view:compliance",
                  "view:audit",
                  "manage:integrations",
                  "manage:org",
                  "manage:settings",
                ] as Permission[]
              ).map((perm) => {
                const granted = permissions.includes(perm);
                return (
                  <div
                    key={perm}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-mono",
                      granted
                        ? "border-healthy/30 bg-healthy/5 text-healthy"
                        : "border-border bg-surface-2/30 text-muted-foreground line-through opacity-50",
                    )}
                  >
                    {granted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {perm}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active sessions */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Globe}>Active Sessions</SectionHeader>
            <div className="space-y-2">
              {SESSIONS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{s.browser}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {s.ip} &middot; {s.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{s.lastActive}</span>
                    {s.current ? (
                      <Badge className="bg-healthy/15 text-healthy border-healthy/30 text-[10px]">Current</Badge>
                    ) : (
                      <button className="text-xs text-critical hover:text-critical/80 font-mono flex items-center gap-1 transition-colors">
                        <Trash2 className="h-3 w-3" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device history */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Smartphone}>Device History</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left py-2 pr-4">Device</th>
                    <th className="text-left py-2 pr-4">OS</th>
                    <th className="text-left py-2 pr-4">Last Seen</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DEVICES.map((d, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 text-foreground">{d.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{d.os}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{d.lastSeen}</td>
                      <td className="py-2.5">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            d.status === "trusted"
                              ? "bg-healthy/15 text-healthy border-healthy/30"
                              : d.status === "managed"
                                ? "bg-info/15 text-info border-info/30"
                                : "bg-high/15 text-high border-high/30",
                          )}
                        >
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Bell}>Notification Preferences</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Email alerts", desc: "Critical and high severity", icon: Mail, defaultChecked: true },
                { label: "Push notifications", desc: "Mobile & desktop", icon: Bell, defaultChecked: true },
                { label: "Slack integration", desc: "#security-alerts channel", icon: MessageSquare, defaultChecked: false },
                { label: "Webhook", desc: "Custom endpoint delivery", icon: Webhook, defaultChecked: true },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <n.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{n.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{n.desc}</p>
                    </div>
                  </div>
                  <Switch defaultChecked={n.defaultChecked} />
                </div>
              ))}
            </div>
          </div>

          {/* API tokens */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Key}>API Tokens</SectionHeader>
            <div className="space-y-2">
              {API_TOKENS.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {t.prefix} &middot; created {t.created} &middot; last used {t.lastUsed}
                    </p>
                  </div>
                  <button className="text-xs text-critical hover:text-critical/80 font-mono flex items-center gap-1 transition-colors">
                    <Trash2 className="h-3 w-3" />
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN (1/3) ===== */}
        <div className="space-y-6">
          {/* Security settings */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Shield}>Security Settings</SectionHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Multi-Factor Auth</p>
                  <p className="text-[10px] text-muted-foreground font-mono">WebAuthn + TOTP</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Session Timeout</p>
                  <p className="text-[10px] text-muted-foreground font-mono">30 minutes</p>
                </div>
                <Badge className="bg-info/15 text-info border-info/30 text-[10px] font-mono">Configured</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">IP Allow-List</p>
                  <p className="text-[10px] text-muted-foreground font-mono">12 ranges</p>
                </div>
                <Badge className="bg-healthy/15 text-healthy border-healthy/30 text-[10px] font-mono">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Password Rotation</p>
                  <p className="text-[10px] text-muted-foreground font-mono">90 days</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  Enforced
                </Badge>
              </div>
            </div>
          </div>

          {/* OAuth providers */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Lock}>Connected Providers</SectionHeader>
            <div className="space-y-3">
              {OAUTH_PROVIDERS.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <p.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-healthy/15 text-healthy border-healthy/30 text-[10px]">Connected</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Clock}>Activity Timeline</SectionHeader>
            <div className="space-y-0">
              {TIMELINE.map((ev, i) => (
                <div key={i} className="relative pl-5 pb-4 last:pb-0">
                  {/* vertical line */}
                  {i < TIMELINE.length - 1 && (
                    <div className="absolute left-[5px] top-2 bottom-0 w-px bg-border" />
                  )}
                  {/* dot */}
                  <div
                    className={cn(
                      "absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-surface",
                      ev.tone === "healthy"
                        ? "bg-healthy"
                        : ev.tone === "critical"
                          ? "bg-critical"
                          : ev.tone === "high"
                            ? "bg-high"
                            : ev.tone === "medium"
                              ? "bg-medium"
                              : "bg-info",
                    )}
                  />
                  <p className="text-xs text-foreground">{ev.action}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {ev.detail} &middot; {ev.time}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit summary */}
          <div className="rounded-lg border border-border bg-surface/60 p-5">
            <SectionHeader icon={Activity}>Audit Summary (7d)</SectionHeader>
            <div className="space-y-2">
              {AUDIT_SUMMARY.map((a) => (
                <div key={a.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{a.label}</span>
                  <span className="text-xs font-mono text-foreground">{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
