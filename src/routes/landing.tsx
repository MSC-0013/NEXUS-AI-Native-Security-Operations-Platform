import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, BrainCircuit, Radar, Activity, GitBranch, FileCheck as FileCheck2, Zap, Terminal, Eye, Bug, Lightbulb, ArrowRight, ChevronRight, Cpu, Lock, Globe, Server, ShieldAlert, ChartBar as BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "NEXUS — AI-Native Security Operations Platform" },
      { name: "description", content: "Unified SIEM, threat intelligence, endpoint security, and AI copilot. From signal to containment in milliseconds." },
      { property: "og:title", content: "NEXUS — AI-Native Security Operations" },
      { property: "og:description", content: "Enterprise security operations platform with AI-driven detection and response." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function useCountUp(end: number, duration = 1800, decimals = 0) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let raf: number;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal((1 - Math.pow(1 - p, 3)) * end);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
}

function InjectAnimations() {
  useEffect(() => {
    const id = "nexus-landing-kf";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
@keyframes attack-line{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(200%);opacity:0}}
@keyframes pulse-node{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}
@keyframes flow-dot{0%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(120px);opacity:0}}
@keyframes scan-move{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes fade-up{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
@keyframes glow-pulse{0%,100%{opacity:.25}50%{opacity:.55}}`;
    document.head.appendChild(s);
  }, []);
  return null;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <InjectAnimations />
      <Navbar />
      <HeroSection />
      <PlatformOverview />
      <AttackMap />
      <Integrations />
      <AIEngine />
      <Metrics />
      <Architecture />
      <WorkflowTimeline />
      <CTAFooter />
    </div>
  );
}

/* ── 0. Navbar ─────────────────────────────────────────────────────────── */
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-12 h-14">
        <Link to="/login" className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
            <ShieldCheck className="size-3.5" />
          </div>
          <span className="font-semibold tracking-tight">NEXUS</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono ml-0.5">Sec Ops</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
          <a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a>
          <a href="#ai-engine" className="hover:text-foreground transition-colors">AI Engine</a>
          <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Launch <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── 1. Hero ─────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute left-0 right-0 h-px bg-primary/20" style={{ animation: "scan-move 8s linear infinite" }} />

      {/* Attack traffic lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute h-px bg-gradient-to-r from-transparent via-critical/40 to-transparent"
            style={{ top: `${15 + i * 18}%`, left: 0, right: 0, animation: `attack-line ${2.5 + i * 0.4}s linear infinite`, animationDelay: `${i * 0.7}s` }} />
        ))}
      </div>

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[500px] rounded-full bg-primary/5 blur-[120px]" style={{ animation: "glow-pulse 6s ease-in-out infinite" }} />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] rounded-full bg-info/5 blur-[100px]" style={{ animation: "glow-pulse 6s ease-in-out infinite 3s" }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div style={{ animation: "fade-up .7s ease-out both" }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40"><ShieldCheck className="size-4" /></div>
              <span className="font-semibold tracking-tight text-lg">NEXUS</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono ml-1">Security Operations</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-balance">
              AI-native security<br />from signal to <span className="text-primary">containment</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
              Unified SIEM, threat intelligence, endpoint, identity, and cloud security — orchestrated by a copilot that thinks like your best analyst.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Launch Workspace <ArrowRight className="size-4" />
              </Link>
              <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition-colors">
                Request Demo <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {[["2.4B", "events/day"], ["42ms", "median detect"], ["99.99%", "uptime SLA"]].map(([n, l]) => (
                <div key={l} className="rounded-md border border-border bg-surface/40 p-3">
                  <div className="text-lg text-foreground font-semibold">{n}</div>{l}
                </div>
              ))}
            </div>
          </div>

          {/* AI Copilot Preview */}
          <div className="hidden lg:block" style={{ animation: "fade-up .7s ease-out .15s both" }}>
            <div className="rounded-xl border border-border bg-surface/70 backdrop-blur p-5 shadow-2xl shadow-background/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-mono text-muted-foreground">
                <BrainCircuit className="size-4 text-primary" /> NEXUS AI Copilot
                <span className="ml-auto flex items-center gap-1"><span className="size-1.5 rounded-full bg-healthy animate-pulse" /> Live</span>
              </div>
              <div className="space-y-3 font-mono text-sm">
                {[
                  { label: "Anomaly", color: "text-critical", text: "Unusual auth pattern — 14 failed attempts from 10.0.3.47 in 90s", delay: 0 },
                  { label: "Correlation", color: "text-high", text: "Matches APT29 lateral movement TTP (T1021.001)", delay: 0.3 },
                  { label: "Action", color: "text-healthy", text: "Recommend: isolate endpoint, revoke session tokens, escalate to IR", delay: 0.6 },
                ].map((l) => (
                  <div key={l.label} className="rounded-md border border-border bg-background/60 px-3 py-2" style={{ animation: `fade-up .4s ease-out ${l.delay}s both` }}>
                    <span className={cn("text-[10px] uppercase tracking-wider font-semibold", l.color)}>{l.label}</span>
                    <p className="mt-0.5 text-xs text-foreground/80">{l.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-critical/15 px-2.5 py-1 text-[10px] font-mono text-critical ring-1 ring-critical/30"><ShieldAlert className="size-3" /> Critical</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-info/15 px-2.5 py-1 text-[10px] font-mono text-info ring-1 ring-info/30"><Radar className="size-3" /> Correlated</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-healthy/15 px-2.5 py-1 text-[10px] font-mono text-healthy ring-1 ring-healthy/30"><Zap className="size-3" /> Remediated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Platform Overview ───────────────────────────────────────────── */
const PLATFORM_FEATURES = [
  { icon: Radar, title: "SIEM", desc: "Ingest, correlate, and search 2.4B events/day with sub-second query." },
  { icon: Globe, title: "Threat Intel", desc: "Curated feeds, MITRE mapping, and automated IOC enrichment." },
  { icon: BrainCircuit, title: "AI Copilot", desc: "Natural-language investigation, root-cause analysis, and auto-remediation." },
  { icon: ShieldCheck, title: "Endpoint Security", desc: "EDR, asset inventory, and runtime protection across 12K+ endpoints." },
  { icon: GitBranch, title: "Attack Graph", desc: "Visualize kill-chain paths and blast radius in real time." },
  { icon: FileCheck2, title: "Compliance", desc: "Automated evidence collection for SOC2, ISO 27001, HIPAA, FedRAMP." },
  { icon: Zap, title: "Incident Response", desc: "Playbooks, war rooms, and automated containment in one click." },
  { icon: BarChart3, title: "Analytics", desc: "Custom dashboards, anomaly detection, and risk scoring." },
];

function PlatformOverview() {
  return (
    <section id="platform" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <SectionHeader tag="Platform" title="One platform. Every security signal."
          desc="NEXUS unifies your security stack into a single operational layer — eliminating tool sprawl, data silos, and alert fatigue." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_FEATURES.map((f, i) => (
            <div key={f.title} className="group rounded-xl border border-border bg-surface/50 p-5 hover:bg-surface hover:border-border-strong transition-colors"
              style={{ animation: `fade-up .4s ease-out ${i * 0.06}s both` }}>
              <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/25 mb-4"><f.icon className="size-4" /></div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. Attack Map ──────────────────────────────────────────────────── */
const ATTACK_POINTS = [
  { x: 18, y: 32, label: "Moscow", sev: "critical" }, { x: 47, y: 30, label: "Beijing", sev: "high" },
  { x: 52, y: 44, label: "Mumbai", sev: "high" }, { x: 25, y: 48, label: "Lagos", sev: "medium" },
  { x: 72, y: 34, label: "Tokyo", sev: "critical" }, { x: 80, y: 38, label: "Seoul", sev: "info" },
  { x: 15, y: 28, label: "London", sev: "healthy" }, { x: 22, y: 36, label: "Berlin", sev: "info" },
  { x: 38, y: 38, label: "Dubai", sev: "high" }, { x: 60, y: 30, label: "Shanghai", sev: "critical" },
];
const SEV_COLOR: Record<string, string> = { critical: "#e5484d", high: "#e5972d", medium: "#d4a843", info: "#3e8af0", healthy: "#30a46c" };

function AttackMap() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        <SectionHeader tag="Realtime" title="Global threat visibility"
          desc="Monitor attack traffic across every region in real time. Correlated, contextualized, and prioritized by AI." />
        <div className="relative rounded-xl border border-border bg-surface/50 p-6 lg:p-10 overflow-hidden">
          <svg viewBox="0 0 100 60" className="w-full h-auto opacity-20" fill="none" stroke="currentColor" strokeWidth="0.3">
            <path d="M12,14 L16,10 L22,12 L26,16 L24,22 L28,26 L26,32 L22,34 L18,40 L14,42 L12,38 L10,30 L12,24Z" />
            <path d="M28,12 L38,10 L44,12 L48,16 L50,22 L48,28 L42,32 L38,34 L32,32 L30,26 L28,20Z" />
            <path d="M42,14 L48,12 L54,14 L58,18 L60,24 L58,28 L54,30 L50,28 L46,24 L44,18Z" />
            <path d="M58,12 L66,10 L74,12 L80,16 L84,22 L82,28 L78,32 L72,34 L66,32 L62,28 L60,22Z" />
            <path d="M80,32 L86,30 L90,34 L88,40 L84,44 L80,42 L78,38Z" />
            <path d="M14,46 L22,44 L28,48 L26,52 L20,54 L14,52Z" />
            <path d="M52,34 L58,32 L64,36 L62,42 L56,46 L50,44 L48,38Z" />
          </svg>
          {ATTACK_POINTS.map((pt, i) => (
            <g key={pt.label}>
              <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="6" fill="none" stroke={SEV_COLOR[pt.sev]} strokeWidth="0.5" opacity="0.4"
                style={{ animation: `pulse-node ${2 + (i % 3) * 0.5}s ease-in-out infinite ${i * 0.3}s` }} />
              <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="2" fill={SEV_COLOR[pt.sev]} className="pointer-events-none" />
              <text x={`${pt.x + 2}%`} y={`${pt.y - 2}%`} fill="currentColor" fontSize="0.7" className="fill-muted-foreground" fontFamily="var(--font-mono)">{pt.label}</text>
            </g>
          ))}
          {/* Connection lines */}
          <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full pointer-events-none">
            {[[0, 9], [2, 5], [1, 8], [4, 5]].map(([a, b], i) => (
              <line key={i} x1={`${ATTACK_POINTS[a].x}%`} y1={`${ATTACK_POINTS[a].y}%`}
                x2={`${ATTACK_POINTS[b].x}%`} y2={`${ATTACK_POINTS[b].y}%`}
                stroke={SEV_COLOR.critical} strokeWidth="0.2" strokeDasharray="2 2" opacity="0.3" />
            ))}
          </svg>
          <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span className="size-2 rounded-full bg-critical animate-pulse" /> Live threat feed
          </div>

          {/* Alert spike bars */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-px h-8 opacity-40">
            {[38, 22, 55, 18, 72, 30, 90, 45, 60, 28, 85, 50, 35, 68, 42, 95, 55, 30, 70, 48].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-primary/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Integrations ────────────────────────────────────────────────── */
const INTEGRATIONS = ["AWS", "Azure", "GCP", "Kubernetes", "GitHub", "Slack", "Datadog", "Prometheus", "Okta", "CrowdStrike", "SentinelOne", "Jira", "PagerDuty", "Snowflake", "Splunk", "Terraform"];

function Integrations() {
  return (
    <section id="integrations" className="relative py-20 lg:py-24 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">Ecosystem</p>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">Integrates with your stack</h2>
        </div>
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex gap-4" style={{ animation: "marquee 40s linear infinite", width: "max-content" }}>
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <div key={`${name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-4 py-2.5 text-sm font-mono text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors whitespace-nowrap">
                <Server className="size-3.5 text-primary/60" />{name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 5. AI Engine ────────────────────────────────────────────────────── */
const AI_FEATURES = [
  { icon: Eye, title: "Anomaly Detection", desc: "Unsupervised ML models surface deviations across auth, network, and cloud telemetry without predefined rules.", color: "text-info", bg: "bg-info/10", ring: "ring-info/25" },
  { icon: Bug, title: "Attack Explanation", desc: "Natural-language breakdowns of attack chains mapped to MITRE ATT&CK, so junior analysts understand what happened.", color: "text-critical", bg: "bg-critical/10", ring: "ring-critical/25" },
  { icon: Lightbulb, title: "Remediation Recommendations", desc: "Context-aware action suggestions ranked by impact and effort — one click to isolate, revoke, or escalate.", color: "text-healthy", bg: "bg-healthy/10", ring: "ring-healthy/25" },
  { icon: BrainCircuit, title: "Investigation Summaries", desc: "Auto-generated incident timelines, root-cause narratives, and evidence packages for post-mortem and compliance.", color: "text-high", bg: "bg-high/10", ring: "ring-high/25" },
];

function AIEngine() {
  return (
    <section id="ai-engine" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 grid-bg opacity-10" />
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">AI Engine</p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">The analyst that never sleeps</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              NEXUS AI continuously monitors every signal, correlates across domains, and delivers actionable intelligence — reducing mean-time-to-response from hours to seconds.
            </p>
            <div className="mt-8 space-y-3 font-mono text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Cpu className="size-4 text-primary" /> Fine-tuned on 4.2B security events</div>
              <div className="flex items-center gap-2"><Lock className="size-4 text-primary" /> On-prem or VPC deployment — your data stays yours</div>
              <div className="flex items-center gap-2"><Terminal className="size-4 text-primary" /> Natural-language query interface</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {AI_FEATURES.map((f, i) => (
              <div key={f.title} className="rounded-xl border border-border bg-surface/50 p-5 hover:bg-surface transition-colors"
                style={{ animation: `fade-up .4s ease-out ${i * 0.1}s both` }}>
                <div className={cn("grid size-9 place-items-center rounded-md mb-4 ring-1", f.bg, f.color, f.ring)}><f.icon className="size-4" /></div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. Metrics ──────────────────────────────────────────────────────── */
const METRICS = [
  { value: 2.4, suffix: "B", label: "events/day", decimals: 1 },
  { value: 42, suffix: "ms", label: "median detect", decimals: 0 },
  { value: 99.99, suffix: "%", label: "uptime SLA", decimals: 2 },
  { value: 12847, suffix: "", label: "endpoints monitored", decimals: 0 },
];

function Metrics() {
  return (
    <section className="relative py-20 lg:py-24 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map((m) => <MetricCard key={m.label} {...m} />)}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ value, suffix, label, decimals }: { value: number; suffix: string; label: string; decimals: number }) {
  const displayed = useCountUp(value, 2000, decimals);
  return (
    <div className="text-center">
      <div className="text-3xl lg:text-4xl font-semibold font-mono tracking-tight text-foreground">
        {displayed}<span className="text-primary">{suffix}</span>
      </div>
      <p className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── 7. Architecture ─────────────────────────────────────────────────── */
const PIPELINE = [
  { icon: Activity, label: "Telemetry", desc: "Ingest & normalize" },
  { icon: Radar, label: "Detection", desc: "Rule + ML signals" },
  { icon: BrainCircuit, label: "AI Correlation", desc: "Cross-domain fusion" },
  { icon: Zap, label: "Incident Response", desc: "Automated containment" },
];

function Architecture() {
  return (
    <section id="architecture" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <SectionHeader tag="Architecture" title="From raw signal to response"
          desc="A streaming pipeline that processes billions of events through detection, correlation, and automated response — in milliseconds." />
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-0">
          {PIPELINE.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-4">
              <div className="relative rounded-xl border border-border bg-surface/50 p-6 w-56 text-center hover:border-border-strong transition-colors"
                style={{ animation: `fade-up .4s ease-out ${i * 0.12}s both` }}>
                <div className="grid size-10 mx-auto place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/25 mb-3"><stage.icon className="size-5" /></div>
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">{stage.desc}</p>
                {i < PIPELINE.length - 1 && (
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary lg:block hidden" style={{ animation: "pulse-node 2s ease-in-out infinite" }} />
                )}
              </div>
              {i < PIPELINE.length - 1 && (
                <>
                  <div className="hidden lg:flex items-center relative w-16">
                    <div className="h-px w-full bg-border-strong" />
                    <div className="absolute size-2 rounded-full bg-primary" style={{ animation: "flow-dot 2s linear infinite" }} />
                    <ArrowRight className="ml-auto size-3 text-muted-foreground" />
                  </div>
                  <div className="lg:hidden flex flex-col items-center h-8">
                    <div className="w-px h-full bg-border-strong" />
                    <ArrowRight className="size-3 text-muted-foreground rotate-90" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 8. Workflow Timeline ────────────────────────────────────────────── */
const TIMELINE_STEPS = [
  { label: "Event", desc: "Signal ingested", color: "text-info", dot: "bg-info" },
  { label: "Alert", desc: "Threshold breached", color: "text-high", dot: "bg-high" },
  { label: "Investigation", desc: "AI root-cause analysis", color: "text-primary", dot: "bg-primary" },
  { label: "Resolution", desc: "Contained & documented", color: "text-healthy", dot: "bg-healthy" },
];

function WorkflowTimeline() {
  return (
    <section className="relative py-24 lg:py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <SectionHeader tag="Workflow" title="Security operations, streamlined" />
        <div className="relative">
          <div className="hidden lg:block absolute top-5 left-0 right-0 h-px bg-border-strong" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step.label} className="relative text-center" style={{ animation: `fade-up .4s ease-out ${i * 0.12}s both` }}>
                <div className="flex justify-center mb-4">
                  <div className={cn("size-3 rounded-full ring-4 ring-background", step.dot)} style={{ animation: "pulse-node 3s ease-in-out infinite" }} />
                </div>
                <h3 className={cn("font-semibold text-sm", step.color)}>{step.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground font-mono">{step.desc}</p>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="hidden lg:block mt-4 text-[10px] font-mono text-muted-foreground">
                    {["< 1ms", "42ms", "2.1s"][i]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 9. CTA Footer ──────────────────────────────────────────────────── */
const COMPLIANCE = ["SOC2", "ISO 27001", "HIPAA", "FedRAMP"];

function CTAFooter() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-12 text-center">
        <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">Get Started</p>
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">Start monitoring in minutes</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Deploy NEXUS with a single agent. Connect your cloud accounts. Start receiving correlated threat intelligence in under 10 minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Launch Workspace <ArrowRight className="size-4" />
          </Link>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition-colors">
            Request Demo
          </button>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors">
            Start Monitoring
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {COMPLIANCE.map((badge) => (
            <span key={badge} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/40 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3 text-healthy" /> {badge}
            </span>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-border text-[11px] font-mono text-muted-foreground">
          NEXUS Security Operations Platform — Enterprise-grade by default.
        </div>
      </div>
    </section>
  );
}

/* ── Shared ──────────────────────────────────────────────────────────── */
function SectionHeader({ tag, title, desc }: { tag: string; title: string; desc?: string }) {
  return (
    <div className="text-center mb-14">
      <p className="text-[11px] uppercase tracking-widest font-mono text-primary mb-3">{tag}</p>
      <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{desc}</p>}
    </div>
  );
}
