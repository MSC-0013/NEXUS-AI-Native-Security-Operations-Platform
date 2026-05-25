import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { ROLE_LABEL } from "@/lib/rbac";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { visibleGroupsForRole } from "@/lib/workspace-config";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = useAuth((s) => s.user?.role);
  const active = useWorkspaceStore((s) => s.getActiveWorkspace());
  const region = useWorkspaceStore((s) => s.region);

  // Avoid hydration mismatch from persisted auth state — render the full
  // catalog on the server pass, then filter once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visibleGroups = visibleGroupsForRole(mounted ? role : undefined);

  return (
    <aside className="hidden md:flex h-screen sticky top-0 w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="relative grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Compass className="size-4" />
          <span className="absolute inset-0 rounded-md ring-1 ring-primary/40" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">NEXUS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {active.orgName}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.key}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {group.label}
            </div>
            <ul className="mt-1 space-y-0.5">
              {group.features.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link to={item.to}>
                      <span
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <span className="size-1.5 rounded-full bg-primary" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {mounted && visibleGroups.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-muted-foreground flex items-center gap-2">
            <Lock className="size-3" /> No modules available for {role ? ROLE_LABEL[role] : "this role"}.
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
          <Globe className="size-3.5 text-healthy" />
          <span className="truncate">{region}</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-healthy pulse-dot text-healthy" />
            Live
          </span>
        </div>
        {mounted && role && (
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
            {ROLE_LABEL[role]} · {visibleGroups.reduce((n, g) => n + g.features.length, 0)} modules
          </div>
        )}
      </div>
    </aside>
  );
}
