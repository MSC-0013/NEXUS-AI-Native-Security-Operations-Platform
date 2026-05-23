import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Download, Calendar, Clock, ChartBar as BarChart3, Shield, TriangleAlert as AlertTriangle, Activity, Search, ChevronRight, Eye, FileSpreadsheet, File as FileJson, FileDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/metric-card";
import { makeMetricSeries } from "@/lib/mock/generators";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NEXUS" },
      { name: "description", content: "Security reporting: templates, generated reports, and schedules." },
    ],
  }),
  component: ReportsPage,
});

/* ---------- data ---------- */

type ReportCategory = "executive" | "compliance" | "vulnerability" | "operational" | "incident" | "threat";

const CATEGORIES: Record<ReportCategory, { label: string; className: string }> = {
  executive: { label: "Executive", className: "bg-primary/15 text-primary border-primary/40" },
  compliance: { label: "Compliance", className: "bg-info/15 text-info border-info/40" },
  vulnerability: { label: "Vulnerability", className: "bg-high/15 text-high border-high/40" },
  operational: { label: "Operational", className: "bg-healthy/15 text-healthy border-healthy/40" },
  incident: { label: "Incident", className: "bg-critical/15 text-critical border-critical/40" },
  threat: { label: "Threat Intel", className: "bg-medium/15 text-medium border-medium/40" },
};

interface Template {
  icon: typeof FileText;
  title: string;
  description: string;
  category: ReportCategory;
  frequency: string;
}

const TEMPLATES: Template[] = [
  { icon: BarChart3, title: "Executive Summary", description: "High-level risk posture and KPI trends for leadership review.", category: "executive", frequency: "Weekly" },
  { icon: Shield, title: "Compliance Report", description: "Control adherence across SOC 2, ISO 27001, PCI-DSS, and HIPAA.", category: "compliance", frequency: "Monthly" },
  { icon: AlertTriangle, title: "Vulnerability Summary", description: "Top exploitable CVEs, patch velocity, and asset exposure breakdown.", category: "vulnerability", frequency: "Weekly" },
  { icon: Activity, title: "SOC Metrics", description: "Analyst utilization, mean-time-to-detect, and escalation rates.", category: "operational", frequency: "Daily" },
  { icon: FileText, title: "Incident Report", description: "Full incident timeline, RCA findings, and remediation actions.", category: "incident", frequency: "Per-incident" },
  { icon: Shield, title: "Threat Landscape", description: "Emerging IOCs, adversary TTPs, and sector-specific threat briefing.", category: "threat", frequency: "Weekly" },
];

type ReportStatus = "ready" | "generating" | "failed";

const STATUS_STYLE: Record<ReportStatus, string> = {
  ready: "bg-healthy/15 text-healthy border-healthy/40",
  generating: "bg-info/15 text-info border-info/40",
  failed: "bg-critical/15 text-critical border-critical/40",
};

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: ReportStatus;
  size: string;
}

const GENERATED_REPORTS: GeneratedReport[] = [
  { id: "r-001", name: "Q1 Executive Summary", type: "Executive Summary", generatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(), status: "ready", size: "2.4 MB" },
  { id: "r-002", name: "SOC 2 Type II — April", type: "Compliance Report", generatedAt: new Date(Date.now() - 18 * 3600_000).toISOString(), status: "ready", size: "8.1 MB" },
  { id: "r-003", name: "CVE Digest Week 21", type: "Vulnerability Summary", generatedAt: new Date(Date.now() - 45 * 60_000).toISOString(), status: "generating", size: "—" },
  { id: "r-004", name: "SOC Shift Report — 2026-05-22", type: "SOC Metrics", generatedAt: new Date(Date.now() - 6 * 3600_000).toISOString(), status: "ready", size: "1.1 MB" },
  { id: "r-005", name: "INC-1003 Post-mortem", type: "Incident Report", generatedAt: new Date(Date.now() - 72 * 3600_000).toISOString(), status: "ready", size: "3.7 MB" },
  { id: "r-006", name: "Threat Briefing — APT41", type: "Threat Landscape", generatedAt: new Date(Date.now() - 24 * 3600_000).toISOString(), status: "ready", size: "5.2 MB" },
  { id: "r-007", name: "PCI-DSS 4.0 — Monthly", type: "Compliance Report", generatedAt: new Date(Date.now() - 168 * 3600_000).toISOString(), status: "failed", size: "—" },
  { id: "r-008", name: "Q2 Executive WIP", type: "Executive Summary", generatedAt: new Date(Date.now() - 10 * 60_000).toISOString(), status: "generating", size: "—" },
];

interface ScheduledReport {
  id: string;
  template: string;
  frequency: "daily" | "weekly" | "monthly";
  nextRun: string;
  lastRun: string | null;
  recipients: number;
}

const SCHEDULED: ScheduledReport[] = [
  { id: "s-001", template: "SOC Metrics", frequency: "daily", nextRun: new Date(Date.now() + 8 * 3600_000).toISOString(), lastRun: new Date(Date.now() - 16 * 3600_000).toISOString(), recipients: 4 },
  { id: "s-002", template: "Executive Summary", frequency: "weekly", nextRun: new Date(Date.now() + 3 * 86400_000).toISOString(), lastRun: new Date(Date.now() - 4 * 86400_000).toISOString(), recipients: 12 },
  { id: "s-003", template: "Vulnerability Summary", frequency: "weekly", nextRun: new Date(Date.now() + 5 * 86400_000).toISOString(), lastRun: new Date(Date.now() - 2 * 86400_000).toISOString(), recipients: 6 },
  { id: "s-004", template: "Compliance Report", frequency: "monthly", nextRun: new Date(Date.now() + 18 * 86400_000).toISOString(), lastRun: new Date(Date.now() - 12 * 86400_000).toISOString(), recipients: 8 },
  { id: "s-005", template: "Threat Landscape", frequency: "weekly", nextRun: new Date(Date.now() + 1 * 86400_000).toISOString(), lastRun: new Date(Date.now() - 6 * 86400_000).toISOString(), recipients: 15 },
];

const FREQ_BADGE: Record<string, string> = {
  daily: "bg-healthy/15 text-healthy border-healthy/40",
  weekly: "bg-info/15 text-info border-info/40",
  monthly: "bg-primary/15 text-primary border-primary/40",
};

/* ---------- component ---------- */

function ReportsPage() {
  const [detailReport, setDetailReport] = useState<GeneratedReport | null>(null);
  const [schedFreq, setSchedFreq] = useState<"daily" | "weekly" | "monthly">("weekly");

  const metricSeries = useMemo(() => ({
    generated: makeMetricSeries(36, 42, 8),
    scheduled: makeMetricSeries(36, 18, 4),
    failed: makeMetricSeries(36, 3, 2),
    downloads: makeMetricSeries(36, 120, 20),
  }), []);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Operations / Reports</div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          <FileText className="size-3.5" /> Generate Report
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Generated (30d)" value={42} delta={{ v: "8%", up: true }} icon={FileDown} tone="info" series={metricSeries.generated} />
        <MetricCard label="Scheduled" value={5} icon={Calendar} tone="default" series={metricSeries.scheduled} />
        <MetricCard label="Failed" value={3} delta={{ v: "1", up: true }} icon={AlertTriangle} tone="critical" series={metricSeries.failed} />
        <MetricCard label="Downloads (30d)" value="1,204" delta={{ v: "14%", up: true }} icon={Download} tone="healthy" series={metricSeries.downloads} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generated">Generated</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        {/* ---- Templates ---- */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => {
              const cat = CATEGORIES[t.category];
              const Icon = t.icon;
              return (
                <div
                  key={t.title}
                  className="group rounded-lg border border-border bg-surface/60 p-5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono", cat.className)}>
                      {cat.label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-medium leading-snug">{t.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{t.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      <Clock className="size-3" /> {t.frequency}
                    </span>
                    <button className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      <FileText className="size-3" /> Generate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ---- Generated ---- */}
        <TabsContent value="generated">
          <div className={cn("grid gap-4", detailReport ? "lg:grid-cols-[1fr_380px]" : "grid-cols-1")}>
            <div className="rounded-lg border border-border bg-surface/60">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[240px] rounded-md border border-border bg-background px-3 py-1.5">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    placeholder="Search reports…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Report</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Generated</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Size</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {GENERATED_REPORTS.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setDetailReport(r)}
                      className={cn("hover:bg-accent/40 cursor-pointer", detailReport?.id === r.id && "bg-accent/30")}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.name}</div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{r.type}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(r.generatedAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono", STATUS_STYLE[r.status])}>
                          {r.status === "generating" && <RefreshCw className="size-2.5 animate-spin" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">{r.size}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "ready" && (
                          <div className="inline-flex items-center gap-1">
                            <button className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground" title="Download PDF">
                              <Download className="size-3" />
                            </button>
                            <button className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground" title="Export CSV">
                              <FileSpreadsheet className="size-3" />
                            </button>
                            <button className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground" title="Export JSON">
                              <FileJson className="size-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail panel */}
            {detailReport && (
              <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-4 h-fit sticky top-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Preview</h3>
                  <button onClick={() => setDetailReport(null)} className="text-[11px] font-mono text-muted-foreground hover:text-foreground">close</button>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Report name</div>
                  <div className="text-sm font-medium">{detailReport.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Type</div>
                  <div className="text-sm text-muted-foreground">{detailReport.type}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Status</div>
                  <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono", STATUS_STYLE[detailReport.status])}>
                    {detailReport.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Generated</div>
                  <div className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(detailReport.generatedAt), { addSuffix: true })}</div>
                </div>

                {/* Mock preview sections */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Sections</div>
                  {["Overview", "Key Findings", "Risk Trend", "Recommendations"].map((s) => (
                    <div key={s} className="rounded-md border border-border bg-background/60 p-2.5 flex items-center gap-2">
                      <Eye className="size-3 text-muted-foreground" />
                      <span className="text-[12px]">{s}</span>
                      <ChevronRight className="size-3 text-muted-foreground ml-auto" />
                    </div>
                  ))}
                </div>

                {detailReport.status === "ready" && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Export as</div>
                    <div className="flex gap-2">
                      <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        <Download className="size-3" /> PDF
                      </button>
                      <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        <FileSpreadsheet className="size-3" /> CSV
                      </button>
                      <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        <FileJson className="size-3" /> JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ---- Scheduled ---- */}
        <TabsContent value="scheduled">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Schedule list */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-surface/60">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <span className="text-sm font-medium">Active schedules</span>
                <button className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                  <Calendar className="size-3" /> New schedule
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Template</th>
                    <th className="px-4 py-2 font-medium">Frequency</th>
                    <th className="px-4 py-2 font-medium">Next run</th>
                    <th className="px-4 py-2 font-medium">Last run</th>
                    <th className="px-4 py-2 font-medium">Recipients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SCHEDULED.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">{s.template}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-mono", FREQ_BADGE[s.frequency])}>
                          {s.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(s.nextRun), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {s.lastRun ? formatDistanceToNow(new Date(s.lastRun), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">{s.recipients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Schedule form */}
            <div className="rounded-lg border border-border bg-surface/60 p-5 space-y-5 h-fit">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">New schedule</div>
                <h3 className="mt-1 text-sm font-medium">Schedule a report</h3>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Template</label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60">
                  {TEMPLATES.map((t) => (
                    <option key={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Frequency</label>
                <div className="flex rounded-md border border-border bg-background p-0.5">
                  {(["daily", "weekly", "monthly"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSchedFreq(f)}
                      className={cn(
                        "flex-1 rounded py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors",
                        schedFreq === f ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Export format</label>
                <div className="flex gap-2">
                  {[
                    { key: "pdf", icon: FileText, label: "PDF" },
                    { key: "csv", icon: FileSpreadsheet, label: "CSV" },
                    { key: "json", icon: FileJson, label: "JSON" },
                  ].map((fmt) => (
                    <button
                      key={fmt.key}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      <fmt.icon className="size-3" /> {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Create schedule
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
