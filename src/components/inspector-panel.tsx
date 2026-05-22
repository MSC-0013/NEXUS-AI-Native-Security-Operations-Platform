import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { X, ExternalLink, FileText, Network, ShieldAlert, User } from "lucide-react";
import { useInspector } from "@/lib/inspector-store";
import { SeverityBadge } from "./severity-badge";
import { formatDistanceToNow } from "date-fns";

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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EventInspector({ e }: { e: import("@/lib/mock/types").SecurityEvent }) {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={e.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">{e.type.replace(/_/g, " ")}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{e.message}</h2>
        <div className="text-[11px] font-mono text-muted-foreground">
          {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })} • {e.source}
        </div>
      </div>

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

function IncidentInspector({ i }: { i: import("@/lib/mock/types").Incident }) {
  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={i.severity} />
          <span className="text-[11px] font-mono text-muted-foreground">{i.code} • {i.status}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{i.title}</h2>
        <p className="text-sm text-muted-foreground">{i.summary}</p>
      </div>

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

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-[12px]" : "text-[13px]"}>{v}</span>
    </div>
  );
}
