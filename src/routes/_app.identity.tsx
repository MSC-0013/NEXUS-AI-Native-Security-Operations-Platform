import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, KeyRound, ShieldOff, UserCheck, UserX, Users } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { useIdentityAnomalies } from "@/lib/api-hooks";
import type { SeverityLevel as Severity } from "@nexus/shared";

export const Route = createFileRoute("/_app/identity")({
  head: () => ({ meta: [{ title: "Identity â€” NEXUS" }] }),
  component: IdentityPage,
});

function IdentityPage() {
  const { data, isLoading } = useIdentityAnomalies();
  const items = data?.items ?? [];
  const critical = items.filter((a) => a.severity === "critical").length;
  const high = items.filter((a) => a.severity === "high").length;

  const sev = (s: string): Severity =>
    s === "critical" ? "critical" : s === "high" ? "high" : s === "medium" ? "medium" : "info";

  return (
    <ModulePreview
      icon={Fingerprint}
      eyebrow="Detect"
      title="Identity"
      description="Identity threat detection â€” anomalous sessions, impossible travel, and MFA fatigue."
      kpis={[
        { label: "Anomalies", value: isLoading ? "â€¦" : items.length, icon: Users, tone: "default" },
        { label: "Critical", value: isLoading ? "â€¦" : critical, icon: ShieldOff, tone: "critical" },
        { label: "High", value: isLoading ? "â€¦" : high, icon: KeyRound, tone: "high" },
        { label: "Unique users", value: isLoading ? "â€¦" : new Set(items.map((a) => a.userEmail)).size, icon: UserCheck, tone: "healthy" },
        { label: "Types", value: isLoading ? "â€¦" : new Set(items.map((a) => a.type)).size, icon: UserX, tone: "info" },
      ]}
      tableTitle="High-risk identity events"
      columns={["User", "Type", "Severity", "Description"]}
      rows={
        items.length === 0 && !isLoading
          ? [{ cells: ["No anomalies", "â€”", "â€”", "â€”"] }]
          : items.slice(0, 8).map((a) => ({
              cells: [a.userEmail, a.type, a.severity.toUpperCase(), a.description ?? "â€”"],
              severity: sev(a.severity),
            }))
      }
      rightPanel={{
        title: "By type",
        items: Object.entries(
          items.reduce<Record<string, number>>((acc, a) => {
            acc[a.type] = (acc[a.type] ?? 0) + 1;
            return acc;
          }, {}),
        )
          .slice(0, 5)
          .map(([label, value]) => ({ label, value: String(value) })),
      }}
    />
  );
}

