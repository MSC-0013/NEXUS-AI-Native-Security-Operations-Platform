import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, Boxes, Cloud, Compass, FileSearch, Fingerprint,
  Gauge, GitBranch, Globe, KeyRound, LayoutDashboard, ListChecks, Network,
  Plug, Settings, Shield, ShieldAlert, Sparkles, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Gauge; soon?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/events", label: "Security Events", icon: FileSearch },
      { to: "/incidents", label: "Incidents", icon: ShieldAlert },
      { to: "/alerts", label: "Alerts", icon: AlertTriangle, soon: true },
    ],
  },
  {
    label: "Detect",
    items: [
      { to: "/threat-intelligence", label: "Threat Intel", icon: Activity, soon: true },
      { to: "/endpoints", label: "Endpoints", icon: Boxes, soon: true },
      { to: "/identity", label: "Identity", icon: Fingerprint, soon: true },
      { to: "/cloud-security", label: "Cloud", icon: Cloud, soon: true },
      { to: "/vulnerabilities", label: "Vulnerabilities", icon: Shield, soon: true },
      { to: "/network", label: "Network", icon: Network, soon: true },
    ],
  },
  {
    label: "Investigate",
    items: [
      { to: "/attack-graph", label: "Attack Graph", icon: GitBranch, soon: true },
      { to: "/copilot", label: "AI Copilot", icon: Sparkles, soon: true },
    ],
  },
  {
    label: "Govern",
    items: [
      { to: "/compliance", label: "Compliance", icon: ListChecks, soon: true },
      { to: "/audit", label: "Audit Log", icon: KeyRound, soon: true },
      { to: "/integrations", label: "Integrations", icon: Plug, soon: true },
      { to: "/organizations", label: "Organization", icon: Users, soon: true },
      { to: "/settings", label: "Settings", icon: Settings, soon: true },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex h-screen sticky top-0 w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="relative grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Compass className="size-4" />
          <span className="absolute inset-0 rounded-md ring-1 ring-primary/40" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">NEXUS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Sec Ops</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {group.label}
            </div>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                const Content = (
                  <span
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      item.soon && "opacity-60",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.soon && (
                      <span className="text-[9px] uppercase font-mono tracking-wider text-muted-foreground/80">
                        Soon
                      </span>
                    )}
                  </span>
                );
                return (
                  <li key={item.to}>
                    {item.soon ? (
                      <div className="cursor-not-allowed">{Content}</div>
                    ) : (
                      <Link to={item.to}>{Content}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
          <Globe className="size-3.5 text-healthy" />
          <span>region us-east-1</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-healthy pulse-dot text-healthy" />
            Live
          </span>
        </div>
      </div>
    </aside>
  );
}
