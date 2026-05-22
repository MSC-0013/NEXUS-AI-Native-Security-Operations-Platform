import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Plug, Plus, RefreshCw, Workflow, XCircle } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Plug}
      eyebrow="Govern"
      title="Integrations"
      description="Connected data sources, response actions, and SOAR pipelines — 200+ connectors across SIEM, EDR, cloud, and ticketing."
      kpis={[
        { label: "Connected", value: 64, icon: CheckCircle2, tone: "healthy" },
        { label: "Degraded", value: 3, icon: RefreshCw, tone: "high" },
        { label: "Failing", value: 2, icon: XCircle, tone: "critical" },
        { label: "Playbooks", value: 41, icon: Workflow, tone: "info" },
        { label: "Available", value: 218, icon: Plus, tone: "default" },
      ]}
      tableTitle="Connected sources"
      columns={["Integration", "Category", "Events / hr", "Last sync", "Status"]}
      rows={[
        { cells: ["Splunk Cloud", "SIEM", "412k", "12s ago", "HEALTHY"], severity: "healthy" },
        { cells: ["CrowdStrike Falcon", "EDR", "188k", "8s ago", "HEALTHY"], severity: "healthy" },
        { cells: ["Okta", "IdP", "44k", "5s ago", "HEALTHY"], severity: "healthy" },
        { cells: ["AWS CloudTrail (prod)", "Cloud", "612k", "2m ago", "DEGRADED"], severity: "high" },
        { cells: ["PagerDuty", "Ticketing", "412/hr", "1m ago", "HEALTHY"], severity: "healthy" },
        { cells: ["GitHub Audit", "DevOps", "8k", "1h ago", "FAILING"], severity: "critical" },
      ]}
      rightPanel={{
        title: "Categories",
        items: [
          { label: "SIEM / Logs", value: "8" },
          { label: "EDR / XDR", value: "6" },
          { label: "Identity", value: "9" },
          { label: "Cloud", value: "14", tone: "info" },
          { label: "Ticketing / Chat", value: "11" },
        ],
      }}
    />
  ),
});
