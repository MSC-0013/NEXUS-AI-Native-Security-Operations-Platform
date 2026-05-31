import { createFileRoute } from "@tanstack/react-router";
import { Bug, Package, Shield, ShieldAlert, Wrench, Zap } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { useVulnerabilities } from "@/lib/api-hooks";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/vulnerabilities")({
  head: () => ({ meta: [{ title: "Vulnerabilities — NEXUS" }] }),
  component: VulnerabilitiesPage,
});

function VulnerabilitiesPage() {
  const { data, isLoading } = useVulnerabilities();
  const items = data?.items ?? [];
  const critical = items.filter((v) => v.severity === "critical").length;
  const high = items.filter((v) => v.severity === "high").length;
  const exploited = items.filter((v) => v.exploitStatus !== "none" && v.exploitStatus !== "unknown").length;

  const sev = (s: string): Severity =>
    s === "critical" ? "critical" : s === "high" ? "high" : s === "medium" ? "medium" : "info";

  return (
    <ModulePreview
      icon={Shield}
      eyebrow="Detect"
      title="Vulnerabilities"
      description="Prioritized vulnerability management with EPSS scoring and exploit intelligence."
      kpis={[
        { label: "Open CVEs", value: isLoading ? "…" : items.length, icon: Bug, tone: "high" },
        { label: "Critical", value: isLoading ? "…" : critical, icon: Zap, tone: "critical" },
        { label: "High", value: isLoading ? "…" : high, icon: ShieldAlert, tone: "high" },
        { label: "Known exploited", value: isLoading ? "…" : exploited, icon: Wrench, tone: "critical" },
        { label: "Assets (sum)", value: isLoading ? "…" : items.reduce((s, v) => s + v.assetCount, 0), icon: Package, tone: "info" },
      ]}
      tableTitle="Top vulnerabilities"
      columns={["CVE", "CVSS", "EPSS", "Patch", "Assets"]}
      rows={
        items.length === 0 && !isLoading
          ? [{ cells: ["No vulnerabilities", "—", "—", "—", "—"] }]
          : items.slice(0, 8).map((v) => ({
              cells: [v.cve, v.cvss.toFixed(1), v.epss.toFixed(2), v.patchStatus, v.assetCount],
              severity: sev(v.severity),
            }))
      }
      rightPanel={{
        title: "Risk distribution",
        items: [
          { label: "Critical", value: String(critical), tone: "critical" },
          { label: "High", value: String(high), tone: "high" },
          { label: "Medium", value: String(items.filter((v) => v.severity === "medium").length) },
          { label: "Low", value: String(items.filter((v) => v.severity === "low" || v.severity === "info").length), tone: "info" },
        ],
      }}
    />
  );
}
