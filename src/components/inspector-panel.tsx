import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { X, ExternalLink, FileText, Network, ShieldAlert, User, Bell, Monitor, Bug, Skull, Clock, Brain, Eye, ShieldCheck, ShieldX, Flame, Activity, Lock, Clock as Unlock, Zap, ArrowUpRight, Ban, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Tag, Crosshair, MapPin, Users, Layers, Package, TrendingUp } from "lucide-react";
import { useInspector } from "@/lib/inspector-store";
import { SeverityBadge } from "./severity-badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { SecurityEvent, Incident, Alert, Endpoint, Vulnerability, ThreatActor } from "@/lib/mock/types";

/* -------------------------------------------------------------------------- */
/*  Main panel                                                                */
/* -------------------------------------------------------------------------- */

export function InspectorPanel() {
  const target = useInspector((s) => s.target);
  const close = useInspector((s) => s.close);

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-border-strong bg-popover shadow-2xl"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 h-12">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary pulse-dot text-primary" />
                Inspector
              </div>
              <button onClick={close} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {target.kind === "event" && <EventInspector e={target.event} />}
            {target.kind === "incident" && <IncidentInspector i={target.incident} />}
            {target.kind === "alert" && <AlertInspector a={target.alert} />}
            {target.kind === "endpoint" && <EndpointInspector ep={target.endpoint} />}
            {target.kind === "vulnerability" && <VulnerabilityInspector v={target.vulnerability} />}
            {target.kind === "actor" && <ActorInspector actor={target.actor} />}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Event Inspector (expanded)                                                */
/* -------------------------------------------------------------------------- */

function EventInspector({ e }: { e: SecurityEvent }) {
  const aiSummary = generateEventAISummary(e);
  const similarEvents = generateSimilarEvents(e);

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={e.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">{e.type.replace(/_/g, " ")}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{e.message}</h2>
        <div className="text-[11px] font-mono text-muted-foreground">
          {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })} &bull; {e.source}
        </div>
      </div>

      <Section title="AI Summary" icon={Brain}>
        <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
      </Section>

      <Section title="Rule" icon={ShieldAlert}>
        <p className="text-sm">{e.rule}</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">{e.mitre}</p>
      </Section>

      <Section title="Network" icon={Network}>
        <KV k="source" v={`${e.sourceIp} (${e.country})`} />
        <KV k="dest" v={e.destIp} />
        <KV k="host" v={e.host} />
        <KV k="asset" v={e.asset} />
      </Section>

      <Section title="Identity" icon={User}>
        <KV k="user" v={e.user} />
        <KV k="session" v={String(e.raw.session)} mono />
      </Section>

      <Section title="Similar Events" icon={Activity}>
        <div className="space-y-2">
          {similarEvents.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-surface/60 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <SeverityBadge severity={s.severity} className="shrink-0" />
                <span className="text-xs truncate">{s.message}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Raw" icon={FileText}>
        <pre className="rounded-md border border-border bg-surface/60 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto">
{JSON.stringify(e.raw, null, 2)}
        </pre>
      </Section>

      <div className="flex gap-2 pt-2">
        <button className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Suppress similar
        </button>
        <button className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Create incident
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Incident Inspector (expanded)                                             */
/* -------------------------------------------------------------------------- */

function IncidentInspector({ i }: { i: Incident }) {
  const slaPercent = calcSLA(i.openedAt, i.severity);
  const slaColor = slaPercent > 75 ? "text-critical" : slaPercent > 50 ? "text-high" : "text-healthy";
  const remediationProgress = calcRemediationProgress(i);
  const aiSummary = generateIncidentAISummary(i);
  const responders = generateResponders(i);

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={i.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">{i.code} &bull; {i.status}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{i.title}</h2>
        <p className="text-sm text-muted-foreground">{i.summary}</p>
      </div>

      <Section title="SLA Timer" icon={Clock}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">Time remaining</span>
            <span className={cn("text-sm font-mono font-medium", slaColor)}>
              {Math.max(0, 100 - Math.round(slaPercent))}%
            </span>
          </div>
          <Progress value={slaPercent} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Opened {formatDistanceToNow(new Date(i.openedAt), { addSuffix: true })}</span>
            <span>Updated {formatDistanceToNow(new Date(i.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
      </Section>

      <Section title="Responders" icon={Users}>
        <div className="space-y-1.5">
          {responders.map((r) => (
            <div key={r.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-surface text-[10px] font-mono font-medium">
                  {r.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px]">{r.name}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{r.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Remediation Progress" icon={CheckCircle2}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">Completion</span>
            <span className="text-sm font-mono font-medium">{remediationProgress}%</span>
          </div>
          <Progress value={remediationProgress} className="h-1.5" />
          <div className="space-y-1">
            {i.recommendations.map((r, idx) => (
              <div key={r} className="flex items-center gap-2 text-xs">
                {idx < Math.floor(recommendationCount(i) * remediationProgress / 100) ? (
                  <CheckCircle2 className="size-3.5 text-healthy shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border border-border" />
                )}
                <span className={cn(idx < Math.floor(recommendationCount(i) * remediationProgress / 100) && "text-muted-foreground line-through")}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="AI Summary" icon={Brain}>
        <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
      </Section>

      <Section title="Impact" icon={ShieldAlert}>
        <KV k="affected assets" v={String(i.affectedAssets)} />
        <KV k="affected users" v={String(i.affectedUsers)} />
        <KV k="category" v={i.category} />
        <KV k="assignee" v={i.assignee} mono />
      </Section>

      <Section title="MITRE ATT&CK" icon={Network}>
        <div className="flex flex-wrap gap-1.5">
          {i.mitre.map((m) => (
            <span key={m} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{m}</span>
          ))}
        </div>
      </Section>

      <Section title="Recommended actions" icon={FileText}>
        <ul className="space-y-1.5 text-sm">
          {i.recommendations.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />{r}
            </li>
          ))}
        </ul>
      </Section>

      <a
        href={`/incidents/${i.code}`}
        className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Open full investigation <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Alert Inspector                                                           */
/* -------------------------------------------------------------------------- */

function AlertInspector({ a }: { a: Alert }) {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={mapAlertSeverity(a.severity)} />
          <span className="text-[11px] font-mono text-muted-foreground">Alert &bull; {a.id}</span>
          {a.escalated && (
            <span className="inline-flex items-center gap-1 rounded-md border border-high/40 bg-high/15 px-1.5 py-0.5 text-[10px] font-mono font-medium text-high">
              <ArrowUpRight className="size-3" /> Escalated
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold leading-snug">{a.rule}</h2>
        <p className="text-sm text-muted-foreground">{a.description}</p>
        <div className="text-[11px] font-mono text-muted-foreground">
          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })} &bull; {a.source}
        </div>
      </div>

      <Section title="AI Priority Score" icon={Brain}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">Priority</span>
            <span className={cn(
              "text-sm font-mono font-bold",
              a.aiPriorityScore >= 80 ? "text-critical" : a.aiPriorityScore >= 50 ? "text-high" : "text-healthy"
            )}>
              {a.aiPriorityScore}/100
            </span>
          </div>
          <Progress value={a.aiPriorityScore} className="h-1.5" />
        </div>
      </Section>

      <Section title="Details" icon={Bell}>
        <KV k="rule" v={a.rule} />
        <KV k="source" v={a.source} />
        <KV k="owner" v={a.owner ?? "Unassigned"} />
        <KV k="dedup count" v={String(a.dedupCount)} />
        <KV k="severity" v={a.severity} />
      </Section>

      <Section title="Escalation Status" icon={Flame}>
        <div className="flex items-center gap-3">
          {a.acknowledged ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-healthy">
              <ShieldCheck className="size-3.5" /> Acknowledged
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-high">
              <Eye className="size-3.5" /> Unacknowledged
            </div>
          )}
          {a.suppressed ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Ban className="size-3.5" /> Suppressed
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Raw" icon={FileText}>
        <pre className="rounded-md border border-border bg-surface/60 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto">
{JSON.stringify(a.raw, null, 2)}
        </pre>
      </Section>

      <div className="flex gap-2 pt-2">
        <button className={cn(
          "flex-1 rounded-md border px-3 py-2 text-sm",
          a.acknowledged
            ? "border-border bg-surface text-muted-foreground cursor-default"
            : "border-border bg-surface hover:bg-surface-2"
        )} disabled={a.acknowledged}>
          {a.acknowledged ? "Acknowledged" : "Acknowledge"}
        </button>
        <button className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Suppress
        </button>
        <button className={cn(
          "flex-1 rounded-md px-3 py-2 text-sm font-medium",
          a.escalated
            ? "bg-surface text-muted-foreground border border-border cursor-default"
            : "bg-primary text-primary-foreground hover:opacity-90"
        )} disabled={a.escalated}>
          {a.escalated ? "Escalated" : "Escalate"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Endpoint Inspector                                                        */
/* -------------------------------------------------------------------------- */

function EndpointInspector({ ep }: { ep: Endpoint }) {
  const osLabel: Record<string, string> = { windows: "Windows", linux: "Linux", macos: "macOS" };

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={riskToSeverity(ep.riskScore.overall)} />
          <span className="text-[11px] font-mono text-muted-foreground">Endpoint &bull; {ep.id}</span>
          {ep.isolated && (
            <span className="inline-flex items-center gap-1 rounded-md border border-high/40 bg-high/15 px-1.5 py-0.5 text-[10px] font-mono font-medium text-high">
              <Lock className="size-3" /> Isolated
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold leading-snug">{ep.hostname}</h2>
        <div className="text-[11px] font-mono text-muted-foreground">
          {ep.ip} &bull; {osLabel[ep.os]}
        </div>
      </div>

      <Section title="Risk Score Breakdown" icon={TrendingUp}>
        <div className="space-y-2.5">
          <RiskBar label="Overall" value={ep.riskScore.overall} />
          <RiskBar label="Malware" value={ep.riskScore.malware} />
          <RiskBar label="Network" value={ep.riskScore.network} />
          <RiskBar label="Credential" value={ep.riskScore.credential} />
          <RiskBar label="Behavior" value={ep.riskScore.behavior} />
        </div>
      </Section>

      <Section title="Agent" icon={Activity}>
        <KV k="version" v={ep.agentVersion} mono />
        <KV k="last check-in" v={formatDistanceToNow(new Date(ep.lastCheckIn), { addSuffix: true })} />
        <KV k="isolation" v={ep.isolated ? "Isolated" : "Active"} />
        <KV k="sessions" v={String(ep.sessionCount)} />
      </Section>

      <Section title="Malware Indicators" icon={Bug}>
        {ep.malwareIndicators.length > 0 ? (
          <div className="space-y-1.5">
            {ep.malwareIndicators.map((m) => (
              <div key={m} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-3.5 text-critical shrink-0" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No malware indicators detected</p>
        )}
      </Section>

      <Section title="Tags" icon={Tag}>
        <div className="flex flex-wrap gap-1.5">
          {ep.tags.map((t) => (
            <span key={t} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{t}</span>
          ))}
          {ep.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
        </div>
      </Section>

      <div className="flex gap-2 pt-2">
        <button className={cn(
          "flex-1 rounded-md px-3 py-2 text-sm font-medium",
          ep.isolated
            ? "border border-border bg-surface hover:bg-surface-2"
            : "border border-high/40 bg-high/10 text-high hover:bg-high/20"
        )}>
          {ep.isolated ? "Release isolation" : "Isolate endpoint"}
        </button>
        <button className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Full details
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vulnerability Inspector                                                   */
/* -------------------------------------------------------------------------- */

function VulnerabilityInspector({ v }: { v: Vulnerability }) {
  const exploitColor = {
    none: "text-healthy",
    poc: "text-medium",
    active: "text-high",
    weaponized: "text-critical",
  };

  const patchLabel = {
    unpatched: "Unpatched",
    patch_available: "Patch Available",
    patched: "Patched",
  };

  const patchColor = {
    unpatched: "text-critical",
    patch_available: "text-high",
    patched: "text-healthy",
  };

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={v.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">{v.cve}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{v.description}</h2>
        <div className="text-[11px] font-mono text-muted-foreground">
          Published {formatDistanceToNow(new Date(v.publishedAt), { addSuffix: true })}
        </div>
      </div>

      <Section title="CVSS Score" icon={ShieldAlert}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">Score</span>
            <span className={cn(
              "text-lg font-mono font-bold",
              v.cvss >= 9 ? "text-critical" : v.cvss >= 7 ? "text-high" : v.cvss >= 4 ? "text-medium" : "text-healthy"
            )}>
              {v.cvss.toFixed(1)}
            </span>
          </div>
          <Progress value={v.cvss * 10} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>0.0</span>
            <span>10.0</span>
          </div>
        </div>
      </Section>

      <Section title="EPSS Probability" icon={TrendingUp}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">Exploit probability</span>
            <span className={cn(
              "text-sm font-mono font-medium",
              v.epss >= 0.7 ? "text-critical" : v.epss >= 0.3 ? "text-high" : "text-healthy"
            )}>
              {(v.epss * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={v.epss * 100} className="h-1.5" />
        </div>
      </Section>

      <Section title="Patch & Exploit Status" icon={Package}>
        <KV k="patch status" v={patchLabel[v.patchStatus]} highlight={patchColor[v.patchStatus]} />
        <KV k="exploit status" v={v.exploitStatus.charAt(0).toUpperCase() + v.exploitStatus.slice(1)} highlight={exploitColor[v.exploitStatus]} />
        <KV k="affected assets" v={String(v.assetCount)} />
      </Section>

      <Section title="Affected Packages" icon={Layers}>
        <div className="flex flex-wrap gap-1.5">
          {v.affectedPackages.map((p) => (
            <span key={p} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{p}</span>
          ))}
        </div>
      </Section>

      <div className="flex gap-2 pt-2">
        <button className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          View advisories
        </button>
        <button className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Create ticket
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Threat Actor Inspector                                                    */
/* -------------------------------------------------------------------------- */

function ActorInspector({ actor }: { actor: ThreatActor }) {
  const originLabel: Record<string, string> = {
    nation_state: "Nation State",
    criminal: "Criminal",
    hacktivist: "Hacktivist",
    insider: "Insider",
    unknown: "Unknown",
  };

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={actor.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">Threat Actor &bull; {actor.id}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{actor.name}</h2>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <MapPin className="size-3" /> {originLabel[actor.origin]}
          &bull; Last seen {formatDistanceToNow(new Date(actor.lastSeen), { addSuffix: true })}
        </div>
      </div>

      <Section title="Motivation" icon={Crosshair}>
        <div className="flex flex-wrap gap-1.5">
          {actor.motivation.map((m) => (
            <span key={m} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{m}</span>
          ))}
        </div>
      </Section>

      <Section title="TTPs" icon={Zap}>
        <div className="flex flex-wrap gap-1.5">
          {actor.ttps.map((t) => (
            <span key={t} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{t}</span>
          ))}
        </div>
      </Section>

      <Section title="Aliases" icon={Tag}>
        <div className="flex flex-wrap gap-1.5">
          {actor.aliases.map((a) => (
            <span key={a} className="rounded border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-mono">{a}</span>
          ))}
          {actor.aliases.length === 0 && <span className="text-sm text-muted-foreground">No known aliases</span>}
        </div>
      </Section>

      <Section title="Activity Timeline" icon={Clock}>
        <div className="relative space-y-3 pl-4 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
          {actor.activityTimeline.map((ev) => (
            <div key={ev.date + ev.event} className="relative">
              <span className="absolute -left-3 top-1 size-2 rounded-full bg-primary" />
              <div className="text-[10px] font-mono text-muted-foreground">{ev.date}</div>
              <div className="text-sm">{ev.event}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Linked Campaigns" icon={Flame}>
        <div className="space-y-1.5">
          {actor.linkedCampaigns.map((c) => (
            <div key={c} className="flex items-center justify-between rounded-md border border-border bg-surface/60 px-3 py-2">
              <span className="text-sm">{c}</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </div>
          ))}
          {actor.linkedCampaigns.length === 0 && <span className="text-sm text-muted-foreground">No linked campaigns</span>}
        </div>
      </Section>

      <a
        href={`/threats/actors/${actor.id}`}
        className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Full actor profile <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared primitives                                                         */
/* -------------------------------------------------------------------------- */

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
        <Icon className="size-3" /> {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({ k, v, mono, highlight }: { k: string; v: string; mono?: boolean; highlight?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">{k}</span>
      <span className={cn(mono ? "font-mono text-[12px]" : "text-[13px]", highlight)}>{v}</span>
    </div>
  );
}

function RiskBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "text-critical" : value >= 50 ? "text-high" : value >= 25 ? "text-medium" : "text-healthy";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-mono font-medium", color)}>{value}</span>
      </div>
      <Progress value={value} className="h-1" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mock data generators                                                      */
/* -------------------------------------------------------------------------- */

function generateEventAISummary(e: SecurityEvent): string {
  const templates: Record<string, string> = {
    failed_login: `Multiple failed authentication attempts detected from ${e.sourceIp} targeting user ${e.user}. This pattern is consistent with credential brute-force or password spraying. Source originates from ${e.country}.`,
    malware_detection: `Malicious payload identified on host ${e.host}. The detection correlates with known malware families targeting ${e.asset}. Immediate containment is recommended.`,
    suspicious_process: `Anomalous process execution observed on ${e.host} under user ${e.user}. The process chain deviates significantly from baseline behavior for this asset.`,
    dns_anomaly: `DNS query pattern from ${e.host} indicates potential command-and-control communication. The destination ${e.destIp} has low reputation score.`,
    privilege_escalation: `User ${e.user} attempted privilege escalation on ${e.host}. This could indicate lateral movement or unauthorized access expansion.`,
    suspicious_api: `Unusual API call pattern from ${e.user} on asset ${e.asset}. The request profile does not match typical usage patterns for this identity.`,
    iam_change: `IAM policy modification detected by ${e.user}. Changes to access controls can indicate defense evasion or persistence mechanisms.`,
    data_exfiltration: `Data transfer from ${e.host} to external destination ${e.destIp} exceeds normal volume thresholds. Potential data loss event.`,
    brute_force: `Brute force attack pattern from ${e.sourceIp} targeting ${e.host}. High frequency of authentication failures detected.`,
    ransomware: `Ransomware indicators detected on ${e.host}. File encryption activity and ransom note creation observed. Immediate isolation recommended.`,
  };
  return templates[e.type] ?? `Security event detected on ${e.host} from source ${e.sourceIp}. Further investigation recommended.`;
}

function generateSimilarEvents(e: SecurityEvent): { id: string; message: string; severity: import("@/lib/mock/types").Severity; timestamp: string }[] {
  return [
    { id: `${e.id}-s1`, message: `Similar ${e.type.replace(/_/g, " ")} on related host`, severity: e.severity, timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: `${e.id}-s2`, message: `Related activity from same source IP`, severity: "medium" as const, timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: `${e.id}-s3`, message: `Pattern match: same MITRE technique`, severity: e.severity, timestamp: new Date(Date.now() - 1800000).toISOString() },
  ];
}

function calcSLA(openedAt: string, severity: import("@/lib/mock/types").Severity): number {
  const hours: Record<string, number> = { critical: 1, high: 4, medium: 24, info: 72, healthy: 168 };
  const total = (hours[severity] ?? 24) * 3600000;
  const elapsed = Date.now() - new Date(openedAt).getTime();
  return Math.min(100, (elapsed / total) * 100);
}

function recommendationCount(i: Incident): number {
  return i.recommendations.length || 1;
}

function calcRemediationProgress(i: Incident): number {
  const statusWeight: Record<string, number> = { open: 10, investigating: 35, contained: 70, resolved: 100 };
  return statusWeight[i.status] ?? 25;
}

function generateIncidentAISummary(i: Incident): string {
  return `Incident ${i.code} is currently ${i.status}, affecting ${i.affectedAssets} assets and ${i.affectedUsers} users. ` +
    `Primary category: ${i.category}. ${i.status === "contained" ? "Containment measures are in effect but monitoring continues." : i.status === "open" ? "Immediate triage and containment actions are recommended." : "Investigation is ongoing with active response coordination."}`;
}

function generateResponders(i: Incident): { name: string; role: string }[] {
  return [
    { name: i.assignee, role: "Lead" },
    { name: "SOC Analyst", role: "Triage" },
    { name: "IR On-Call", role: "Response" },
  ];
}

function mapAlertSeverity(s: Alert["severity"]): import("@/lib/mock/types").Severity {
  const map: Record<string, import("@/lib/mock/types").Severity> = { critical: "critical", high: "high", medium: "medium", low: "info", info: "info" };
  return map[s] ?? "info";
}

function riskToSeverity(score: number): import("@/lib/mock/types").Severity {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "healthy";
}
