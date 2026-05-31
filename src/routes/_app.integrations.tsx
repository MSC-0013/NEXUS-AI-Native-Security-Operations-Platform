import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Plug, Plus, RefreshCw, Workflow, XCircle } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { useIntegrations } from "@/lib/api-hooks";
import type { Severity } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — NEXUS" }] }),
  component: IntegrationsPage,
});

function statusSeverity(status: string): Severity {
  if (status === "healthy" || status === "connected") return "healthy";
  if (status === "degraded") return "high";
  if (status === "failing" || status === "error") return "critical";
  return "info";
}

function IntegrationsPage() {
  const { data, isLoading } = useIntegrations();
  const items = data?.items ?? [];
  const connected = items.filter((i) => i.status === "connected" || i.status === "healthy").length;
  const degraded = items.filter((i) => i.status === "degraded").length;
  const failing = items.filter((i) => i.status === "failing" || i.status === "error").length;

  return (
    <ModulePreview
      icon={Plug}
      eyebrow="Govern"
      title="Integrations"
      description="Connected data sources, response actions, and SOAR pipelines."
      kpis={[
        { label: "Connected", value: isLoading ? "…" : connected, icon: CheckCircle2, tone: "healthy" },
        { label: "Degraded", value: isLoading ? "…" : degraded, icon: RefreshCw, tone: "high" },
        { label: "Failing", value: isLoading ? "…" : failing, icon: XCircle, tone: "critical" },
        { label: "Total", value: isLoading ? "…" : items.length, icon: Workflow, tone: "info" },
        { label: "Catalog", value: "200+", icon: Plus, tone: "default" },
      ]}
      tableTitle="Connected sources"
      columns={["Integration", "Provider", "Events ingested", "Status"]}
      rows={
        items.length === 0 && !isLoading
          ? [{ cells: ["No integrations", "—", "—", "—"] }]
          : items.map((i) => ({
              cells: [i.displayName, i.provider, i.eventsIngested.toLocaleString(), i.status.toUpperCase()],
              severity: statusSeverity(i.status),
            }))
      }
      rightPanel={{
        title: "By provider",
        items: Object.entries(
          items.reduce<Record<string, number>>((acc, i) => {
            acc[i.provider] = (acc[i.provider] ?? 0) + 1;
            return acc;
          }, {}),
        )
          .slice(0, 5)
          .map(([label, value]) => ({ label, value: String(value) })),
      }}
    />
  );
}
