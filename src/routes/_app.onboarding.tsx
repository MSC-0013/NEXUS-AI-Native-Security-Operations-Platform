import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Check, Cloud, Laptop, Plug, Bell, Rocket, Building2, Globe, Users, Copy, Mail, MessageSquare, CircleAlert as AlertCircle, Webhook, Shield, Database, GitBranch, FingerprintPattern as Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — NEXUS" },
      { name: "description", content: "Set up your security workspace." },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = [
  { id: 1, label: "Workspace", icon: Building2 },
  { id: 2, label: "Cloud", icon: Cloud },
  { id: 3, label: "Alerts", icon: Bell },
  { id: 4, label: "Endpoints", icon: Laptop },
  { id: 5, label: "Integrations", icon: Plug },
] as const;

const REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "EU West (Ireland)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
];

const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

const CLOUD_PROVIDERS = [
  { id: "aws", name: "Amazon Web Services", icon: Cloud, color: "text-[oklch(0.72_0.15_50)]" },
  { id: "azure", name: "Microsoft Azure", icon: Cloud, color: "text-[oklch(0.65_0.18_260)]" },
  { id: "gcp", name: "Google Cloud Platform", icon: Cloud, color: "text-[oklch(0.72_0.16_145)]" },
];

const ALERT_CHANNELS = [
  { id: "email", label: "Email", icon: Mail, description: "Send alerts to your team inbox" },
  { id: "slack", label: "Slack", icon: MessageSquare, description: "Post to designated channels" },
  { id: "pagerduty", label: "PagerDuty", icon: AlertCircle, description: "Escalate to on-call responders" },
  { id: "webhook", label: "Webhook", icon: Webhook, description: "Push to custom endpoints" },
];

const AGENT_COMMANDS = {
  linux: "curl -fsSL https://get.nexus.dev/agent | sudo sh",
  macos: "curl -fsSL https://get.nexus.dev/agent | sh",
  windows: 'Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://get.nexus.dev/agent.ps1\'))',
};

const INTEGRATIONS = [
  { id: "splunk", name: "Splunk", icon: Database, category: "SIEM" },
  { id: "crowdstrike", name: "CrowdStrike", icon: Shield, category: "EDR" },
  { id: "okta", name: "Okta", icon: Fingerprint, category: "Identity" },
  { id: "github", name: "GitHub", icon: GitBranch, category: "DevOps" },
  { id: "jira", name: "Jira", icon: Plug, category: "Ticketing" },
  { id: "sentinelone", name: "SentinelOne", icon: Shield, category: "EDR" },
];

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1 state
  const [workspaceName, setWorkspaceName] = useState(user?.workspace ?? "");
  const [region, setRegion] = useState("us-east-1");
  const [teamSize, setTeamSize] = useState("6-20");

  // Step 2 state
  const [cloudConnections, setCloudConnections] = useState<Record<string, boolean>>({});

  // Step 3 state
  const [alertChannels, setAlertChannels] = useState<Record<string, boolean>>({ email: true });
  const [threshold, setThreshold] = useState(75);

  // Step 4 state
  const [copiedOs, setCopiedOs] = useState<string | null>(null);

  // Step 5 state
  const [enabledIntegrations, setEnabledIntegrations] = useState<Record<string, boolean>>({});

  const next = useCallback(() => setStep((s) => Math.min(s + 1, 5)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handleCopy = useCallback((os: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedOs(os);
    setTimeout(() => setCopiedOs(null), 2000);
  }, []);

  const handleLaunch = useCallback(() => {
    navigate({ to: "/dashboard" });
  }, [navigate]);

  const progress = ((step - 1) / 4) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Step {step} of 5
            </span>
            <span className="font-mono text-[11px]">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "size-9 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                      isDone && "bg-primary border-primary text-primary-foreground",
                      isActive && "border-primary text-primary bg-primary/10",
                      !isDone && !isActive && "border-border text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono uppercase tracking-wider",
                      isActive && "text-foreground",
                      !isActive && "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-1.5 mb-5 transition-colors duration-200",
                      step > s.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Content card */}
        <div className="rounded-xl border border-border bg-surface/60 p-6 md:p-8">
          {step === 1 && (
            <StepWorkspace
              workspaceName={workspaceName}
              setWorkspaceName={setWorkspaceName}
              region={region}
              setRegion={setRegion}
              teamSize={teamSize}
              setTeamSize={setTeamSize}
            />
          )}
          {step === 2 && (
            <StepCloud
              connections={cloudConnections}
              onToggle={(id) =>
                setCloudConnections((prev) => ({ ...prev, [id]: !prev[id] }))
              }
            />
          )}
          {step === 3 && (
            <StepAlerts
              channels={alertChannels}
              onToggleChannel={(id) =>
                setAlertChannels((prev) => ({ ...prev, [id]: !prev[id] }))
              }
              threshold={threshold}
              setThreshold={setThreshold}
            />
          )}
          {step === 4 && (
            <StepEndpoints copiedOs={copiedOs} onCopy={handleCopy} />
          )}
          {step === 5 && (
            <StepIntegrations
              enabled={enabledIntegrations}
              onToggle={(id) =>
                setEnabledIntegrations((prev) => ({ ...prev, [id]: !prev[id] }))
              }
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 1}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors",
              step === 1
                ? "opacity-0 pointer-events-none"
                : "hover:bg-surface text-foreground"
            )}
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          <button
            onClick={next}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>

          {step < 5 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Rocket className="size-4" /> Launch Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Workspace Setup ─── */

function StepWorkspace({
  workspaceName,
  setWorkspaceName,
  region,
  setRegion,
  teamSize,
  setTeamSize,
}: {
  workspaceName: string;
  setWorkspaceName: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  teamSize: string;
  setTeamSize: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Set up your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Name your workspace, choose a region, and tell us about your team size.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" /> Workspace name
          </label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="e.g. Acme Security"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" /> Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> Team size
          </label>
          <div className="flex flex-wrap gap-2">
            {TEAM_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setTeamSize(size)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  teamSize === size
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Connect Cloud Provider ─── */

function StepCloud({
  connections,
  onToggle,
}: {
  connections: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Connect cloud provider</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Link your cloud accounts to ingest security events and monitor misconfigurations.
        </p>
      </div>

      <div className="space-y-3">
        {CLOUD_PROVIDERS.map((provider) => {
          const connected = connections[provider.id];
          const Icon = provider.icon;
          return (
            <div
              key={provider.id}
              className={cn(
                "rounded-lg border p-4 flex items-center justify-between gap-4 transition-colors",
                connected ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("size-10 rounded-lg bg-surface-2 flex items-center justify-center", provider.color)}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">{provider.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {connected ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onToggle(provider.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  connected
                    ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                {connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 3: Configure Alerts ─── */

function StepAlerts({
  channels,
  onToggleChannel,
  threshold,
  setThreshold,
}: {
  channels: Record<string, boolean>;
  onToggleChannel: (id: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configure alert channels</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how your team receives security alerts and set the minimum severity threshold.
        </p>
      </div>

      <div className="space-y-3">
        {ALERT_CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const enabled = channels[ch.id] ?? false;
          return (
            <div
              key={ch.id}
              className="rounded-lg border border-border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-surface-2 flex items-center justify-center text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{ch.label}</div>
                  <div className="text-[11px] text-muted-foreground">{ch.description}</div>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={() => onToggleChannel(ch.id)} />
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Minimum alert threshold</label>
          <span className="text-sm font-mono text-primary">
            {threshold >= 80 ? "Critical" : threshold >= 60 ? "High" : threshold >= 40 ? "Medium" : "Low"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-primary h-1.5 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Connect Endpoints ─── */

function StepEndpoints({
  copiedOs,
  onCopy,
}: {
  copiedOs: string | null;
  onCopy: (os: string, cmd: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Deploy agents to endpoints</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Install the NEXUS agent on your infrastructure. Copy the command for each operating system.
        </p>
      </div>

      <div className="space-y-3">
        {(
          [
            { os: "linux", label: "Linux / Docker", icon: Laptop },
            { os: "macos", label: "macOS", icon: Laptop },
            { os: "windows", label: "Windows (PowerShell)", icon: Laptop },
          ] as const
        ).map(({ os, label, icon: Icon }) => (
          <div key={os} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </div>
            <div className="relative">
              <pre className="rounded-md bg-background border border-border p-3 text-[12px] font-mono text-foreground overflow-x-auto pr-10">
                {AGENT_COMMANDS[os]}
              </pre>
              <button
                onClick={() => onCopy(os, AGENT_COMMANDS[os])}
                className="absolute top-2 right-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                title="Copy command"
              >
                {copiedOs === os ? (
                  <Check className="size-3.5 text-healthy" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 5: Choose Integrations ─── */

function StepIntegrations({
  enabled,
  onToggle,
}: {
  enabled: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Connect your tools</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enable integrations to pull in telemetry and automate response actions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const isEnabled = enabled[integration.id] ?? false;
          return (
            <div
              key={integration.id}
              className={cn(
                "rounded-lg border p-4 flex items-center justify-between gap-3 transition-colors",
                isEnabled ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-surface-2 flex items-center justify-center text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{integration.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {integration.category}
                  </div>
                </div>
              </div>
              <Switch checked={isEnabled} onCheckedChange={() => onToggle(integration.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
