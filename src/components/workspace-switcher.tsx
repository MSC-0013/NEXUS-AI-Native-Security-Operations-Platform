import { useState } from "react";
import { Building2, ChevronDown, Globe, Monitor, Server } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceStore, type Environment, type Region } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const ENV_COLORS: Record<Environment, string> = {
  production: "text-critical border-critical/30 bg-critical/10",
  staging: "text-high border-high/30 bg-high/10",
  development: "text-medium border-medium/30 bg-medium/10",
};

const REGION_LABELS: Record<Region, string> = {
  "us-east-1": "US East",
  "eu-west-1": "EU West",
  "ap-southeast-1": "APAC",
};

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const { workspaces, activeWorkspaceId, environment, setActiveWorkspace, setEnvironment, setRegion, getActiveWorkspace } = useWorkspaceStore();
  const active = getActiveWorkspace();

  const orgs = workspaces.reduce<Record<string, typeof workspaces>>((acc, ws) => {
    (acc[ws.orgId] ??= []).push(ws);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface/60",
            "hover:bg-surface transition-colors text-sm max-w-[280px]",
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono font-bold bg-primary/20 text-primary shrink-0">
            {active.initials}
          </span>
          <span className="truncate font-medium">{active.name}</span>
          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", ENV_COLORS[environment])}>
            {environment === "production" ? "prod" : environment === "staging" ? "stage" : "dev"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0 bg-background border-border">
        {/* Environment quick switch */}
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 border-b border-border">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Environment</span>
          <div className="flex gap-1 ml-auto">
            {(["production", "staging", "development"] as Environment[]).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={cn(
                  "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                  environment === env ? ENV_COLORS[env] : "text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {env === "production" ? "prod" : env === "staging" ? "stage" : "dev"}
              </button>
            ))}
          </div>
        </div>

        {/* Workspaces by org */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {Object.entries(orgs).map(([orgId, wsList]) => (
            <div key={orgId}>
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{wsList[0].orgName}</span>
              </div>
              {wsList.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-start gap-2.5 px-3 py-2 hover:bg-surface transition-colors text-left",
                    ws.id === activeWorkspaceId && "bg-surface/80 border-l-2 border-l-primary",
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-mono font-bold bg-primary/20 text-primary mt-0.5 shrink-0">
                    {ws.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{ws.name}</span>
                      <span className={cn("text-[8px] font-mono px-1 py-px rounded border", ENV_COLORS[ws.environment])}>
                        {ws.environment === "production" ? "prod" : ws.environment === "staging" ? "stage" : "dev"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Server className="h-2.5 w-2.5" />{ws.stats.endpoints}</span>
                      <span className="flex items-center gap-0.5 text-critical">{ws.stats.activeAlerts} alerts</span>
                      <span className="flex items-center gap-0.5 text-high">{ws.stats.openIncidents} inc</span>
                      <span className="flex items-center gap-0.5">{ws.stats.unresolvedVulns} vulns</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Region selector */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Region</span>
          <div className="flex gap-1 ml-auto">
            {(["us-east-1", "eu-west-1", "ap-southeast-1"] as Region[]).map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={cn(
                  "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                  active.region === r ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {REGION_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
