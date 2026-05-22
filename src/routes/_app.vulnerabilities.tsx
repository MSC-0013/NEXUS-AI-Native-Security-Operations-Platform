import { createFileRoute } from "@tanstack/react-router";
import { Bug, Package, Shield, ShieldAlert, Wrench, Zap } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/vulnerabilities")({
  head: () => ({ meta: [{ title: "Vulnerabilities — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Shield}
      eyebrow="Detect"
      title="Vulnerabilities"
      description="Prioritized vulnerability management with EPSS scoring, exploit intelligence, and reachable-from-internet context."
      kpis={[
        { label: "Open CVEs", value: "14,228", icon: Bug, tone: "high", series: 200 },
        { label: "Critical + exploited", value: 47, icon: Zap, tone: "critical", series: 30 },
        { label: "Packages scanned", value: "92k", icon: Package, tone: "info" },
        { label: "Patched (30d)", value: "3,812", icon: Wrench, tone: "healthy", series: 80 },
        { label: "Avg. MTTR", value: "11d", icon: ShieldAlert, tone: "default" },
      ]}
      tableTitle="Top exploitable vulnerabilities"
      columns={["CVE", "Package", "CVSS", "EPSS", "Assets"]}
      rows={[
        { cells: ["CVE-2024-3094 (xz-utils backdoor)", "liblzma 5.6.0", "10.0", "0.94", 22], severity: "critical" },
        { cells: ["CVE-2024-21762 (FortiOS SSL-VPN)", "fortios", "9.8", "0.91", 4], severity: "critical" },
        { cells: ["CVE-2023-44487 (HTTP/2 Rapid Reset)", "nginx 1.25.2", "7.5", "0.88", 312], severity: "high" },
        { cells: ["CVE-2024-1086 (Linux nf_tables)", "kernel 5.15", "7.8", "0.72", 1840], severity: "high" },
        { cells: ["CVE-2023-50164 (Struts2 path traversal)", "struts 2.5.32", "9.8", "0.81", 6], severity: "critical" },
        { cells: ["CVE-2024-27198 (TeamCity auth bypass)", "teamcity 2023.11", "9.8", "0.86", 2], severity: "critical" },
      ]}
      rightPanel={{
        title: "Risk distribution",
        items: [
          { label: "Critical", value: "412", tone: "critical" },
          { label: "High", value: "2,108", tone: "high" },
          { label: "Medium", value: "6,902" },
          { label: "Low", value: "4,806", tone: "info" },
          { label: "Internet-reachable", value: "189", tone: "critical" },
        ],
      }}
    />
  ),
});
