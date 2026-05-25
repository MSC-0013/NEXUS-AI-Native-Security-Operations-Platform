import { Building2, Globe, Server, ShieldAlert, TriangleAlert as AlertTriangle, Bug } from "lucide-react";
import { useWorkspaceStore, type Environment } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const ENV_TONE: Record<Environment, string> = {
  production: "text-critical border-critical/30 bg-critical/10",
  staging:    "text-high border-high/30 bg-high/10",
  development:"text-medium border-medium/30 bg-medium/10",
};

const REGION_LABEL: Record<string, string> = {
  "us-east-1": "US East",
  "eu-west-1": "EU West",
  "ap-southeast-1": "APAC",
};

/**
 * Compact workspace context strip — surfaces the active org / workspace /
 * env / region and its rolling stats. Render at the top of any module page
 * so users always know which tenant they are operating in.
 */
export function WorkspaceContext({ className }: { className?: string }) {
  const active = useWorkspaceStore((s) => s.getActiveWorkspace());
  const environment = useWorkspaceStore((s) => s.environment);
  const region = useWorkspaceStore((s) => s.region);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface/40 px-4 py-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="grid size-7 place-items-center rounded bg-primary/15 text-primary text-[10px] font-mono font-bold shrink-0">
          {active.initials}
        </span>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{active.name}</span>
            <span className={cn("text-[9px] font-mono px-1.5 py-px rounded border uppercase", ENV_TONE[environment])}>
              {environment === "production" ? "prod" : environment === "staging" ? "stage" : "dev"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Building2 className="size-2.5" />
            <span className="truncate">{active.orgName}</span>
            <span className="opacity-40">·</span>
            <Globe className="size-2.5" />
            <span>{REGION_LABEL[region] ?? region}</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] font-mono">
        <Stat icon={Server}        label="endpoints" value={active.stats.endpoints.toLocaleString()} />
        <Stat icon={AlertTriangle} label="alerts"    value={active.stats.activeAlerts}    tone="critical" />
        <Stat icon={ShieldAlert}   label="incidents" value={active.stats.openIncidents}   tone="high" />
        <Stat icon={Bug}           label="vulns"     value={active.stats.unresolvedVulns} tone="medium" />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Server;
  label: string;
  value: string | number;
  tone?: "critical" | "high" | "medium";
}) {
  const toneCls =
    tone === "critical" ? "text-critical" :
    tone === "high"     ? "text-high" :
    tone === "medium"   ? "text-medium" :
    "text-foreground";
  return (
    <span className="flex items-center gap-1">
      <Icon className={cn("size-3", toneCls)} />
      <span className={cn("tabular-nums", toneCls)}>{value}</span>
      <span className="text-muted-foreground uppercase tracking-wider text-[9px]">{label}</span>
    </span>
  );
}
