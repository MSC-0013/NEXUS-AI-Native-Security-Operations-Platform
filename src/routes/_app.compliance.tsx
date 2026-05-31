import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ClipboardCheck, FileCheck, ListChecks, ScrollText, XCircle } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { useCompliance } from "@/lib/api-hooks";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — NEXUS" }] }),
  component: CompliancePage,
});

function CompliancePage() {
  const { data, isLoading } = useCompliance();
  const items = data?.items ?? [];
  const failingControls = items.flatMap((a) => a.controls.filter((c) => c.status === "fail" || c.status === "failed"));
  const avgScore =
    items.length > 0 ? Math.round(items.reduce((s, a) => s + a.scorePercent, 0) / items.length) : 0;

  return (
    <ModulePreview
      icon={ListChecks}
      eyebrow="Govern"
      title="Compliance"
      description="Continuous control monitoring across SOC 2, ISO 27001, PCI-DSS, and more."
      kpis={[
        { label: "Frameworks", value: isLoading ? "…" : items.length, icon: ScrollText, tone: "info" },
        { label: "Avg score", value: isLoading ? "…" : `${avgScore}%`, icon: BadgeCheck, tone: "healthy" },
        { label: "Failing controls", value: isLoading ? "…" : failingControls.length, icon: XCircle, tone: "critical" },
        { label: "Assessments", value: isLoading ? "…" : items.filter((a) => a.status === "active").length, icon: FileCheck, tone: "default" },
        { label: "In review", value: isLoading ? "…" : items.filter((a) => a.status !== "passing").length, icon: ClipboardCheck, tone: "high" },
      ]}
      tableTitle="Failing controls"
      columns={["Control", "Framework", "Title", "Status"]}
      rows={
        failingControls.length === 0 && !isLoading
          ? [{ cells: ["All controls passing", "—", "—", "PASS"], severity: "healthy" }]
          : failingControls.slice(0, 8).map((c) => {
              const assessment = items.find((a) => a.controls.some((x) => x.id === c.id));
              return {
                cells: [c.controlId, assessment?.framework ?? "—", c.title, c.status.toUpperCase()],
                severity: "high" as Severity,
              };
            })
      }
      rightPanel={{
        title: "Framework health",
        items: items.map((a) => ({
          label: a.name,
          value: `${a.scorePercent}%`,
          tone: a.scorePercent >= 90 ? "healthy" : a.scorePercent >= 75 ? "info" : "high",
        })),
      }}
    />
  );
}
