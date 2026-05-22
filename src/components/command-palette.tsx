import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AlertTriangle, FileSearch, Fingerprint, GitBranch, LayoutDashboard,
  ListChecks, Plug, Settings, ShieldAlert, Sparkles,
} from "lucide-react";

const PAGES = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, hint: "Operational summary" },
  { to: "/events", label: "Security Events", icon: FileSearch, hint: "SIEM explorer" },
  { to: "/incidents", label: "Incidents", icon: ShieldAlert, hint: "Triage and response" },
];
const ACTIONS = [
  { label: "Open AI Copilot", icon: Sparkles, hint: "Soon" },
  { label: "Acknowledge all alerts", icon: AlertTriangle, hint: "Bulk action" },
  { label: "Open Attack Graph", icon: GitBranch, hint: "Soon" },
  { label: "View Compliance posture", icon: ListChecks, hint: "Soon" },
  { label: "Manage integrations", icon: Plug, hint: "Soon" },
  { label: "Identity risk review", icon: Fingerprint, hint: "Soon" },
  { label: "Settings", icon: Settings, hint: "Workspace settings" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 backdrop-blur-sm pt-[15vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global command palette" className="[&_[cmdk-input]]:bg-transparent">
          <div className="border-b border-border px-3 py-2.5">
            <Command.Input
              autoFocus
              placeholder="Search pages, events, incidents, actions…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</Command.Empty>

            <Command.Group heading="Navigate" className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {PAGES.map((p) => {
                const Icon = p.icon;
                return (
                  <Command.Item
                    key={p.to}
                    value={`${p.label} ${p.to}`}
                    onSelect={() => { navigate({ to: p.to }); onOpenChange(false); }}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{p.label}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{p.hint}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions" className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <Command.Item
                    key={a.label}
                    value={a.label}
                    onSelect={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{a.label}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{a.hint}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>NEXUS • Command</span>
            <span>esc to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
