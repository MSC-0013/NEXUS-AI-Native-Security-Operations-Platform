import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ClipboardCheck, FileCheck, ListChecks, ScrollText, XCircle } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={ListChecks}
      eyebrow="Govern"
      title="Compliance"
      description="Continuous control monitoring across SOC 2, ISO 27001, PCI-DSS, HIPAA, and FedRAMP frameworks."
      kpis={[
        { label: "Frameworks", value: 7, icon: ScrollText, tone: "info" },
        { label: "Controls passing", value: "94.2%", icon: BadgeCheck, tone: "healthy", series: 80 },
        { label: "Failing controls", value: 38, icon: XCircle, tone: "critical" },
        { label: "Evidence collected", value: "12,402", icon: FileCheck, tone: "default" },
        { label: "Next audit", value: "21d", icon: ClipboardCheck, tone: "high" },
      ]}
      tableTitle="Failing controls"
      columns={["Control", "Framework", "Owner", "Last test", "Status"]}
      rows={[
        { cells: ["CC6.1 Logical access provisioning", "SOC 2", "secops", "2h ago", "FAIL"], severity: "high" },
        { cells: ["A.9.2.5 Review of access rights", "ISO 27001", "it-admin", "1d ago", "FAIL"], severity: "high" },
        { cells: ["PCI 8.3 MFA on all admin access", "PCI-DSS", "secops", "3h ago", "FAIL"], severity: "critical" },
        { cells: ["§164.312(b) Audit controls", "HIPAA", "platform", "1d ago", "FAIL"], severity: "medium" },
        { cells: ["AC-2 Account management", "FedRAMP", "secops", "4h ago", "FAIL"], severity: "high" },
      ]}
      rightPanel={{
        title: "Framework health",
        items: [
          { label: "SOC 2 Type II", value: "96%", tone: "healthy" },
          { label: "ISO 27001", value: "94%", tone: "healthy" },
          { label: "PCI-DSS 4.0", value: "88%", tone: "high" },
          { label: "HIPAA", value: "91%", tone: "high" },
          { label: "FedRAMP Mod.", value: "82%", tone: "high" },
        ],
      }}
    />
  ),
});
