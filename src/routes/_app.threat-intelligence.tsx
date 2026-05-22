import { createFileRoute } from "@tanstack/react-router";
import { Activity, Crosshair, Globe, Skull, Tag, TrendingUp } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/threat-intelligence")({
  head: () => ({ meta: [{ title: "Threat Intelligence — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Crosshair}
      eyebrow="Detect"
      title="Threat Intelligence"
      description="Aggregated IOCs, threat actor tracking, and curated intel feeds enriched with internal telemetry."
      kpis={[
        { label: "Active IOCs", value: "284k", icon: Tag, tone: "info", series: 200 },
        { label: "Tracked actors", value: 1142, icon: Skull, tone: "critical", series: 60 },
        { label: "Feeds online", value: "38/40", icon: Activity, tone: "healthy" },
        { label: "Hits / 24h", value: 3219, icon: TrendingUp, tone: "high", series: 120, delta: { v: "8%", up: true } },
        { label: "Geo coverage", value: "194", icon: Globe, tone: "default" },
      ]}
      tableTitle="Recent threat actor activity"
      columns={["Actor", "Origin", "Motivation", "TTPs", "Last seen"]}
      rows={[
        { cells: ["APT29 (Cozy Bear)", "RU", "Espionage", "T1078, T1059, T1071", "12m ago"], severity: "critical" },
        { cells: ["Lazarus Group", "KP", "Financial / Espionage", "T1486, T1567", "1h ago"], severity: "critical" },
        { cells: ["FIN7", "Multi", "Financial", "T1190, T1059", "3h ago"], severity: "high" },
        { cells: ["Scattered Spider", "Multi", "Extortion", "T1078, T1110", "5h ago"], severity: "high" },
        { cells: ["TA505", "RU", "Financial", "T1071, T1567", "14h ago"], severity: "medium" },
        { cells: ["Volt Typhoon", "CN", "Espionage / Pre-positioning", "T1003, T1190", "1d ago"], severity: "high" },
      ]}
      rightPanel={{
        title: "Top feeds",
        items: [
          { label: "Mandiant", value: "98k IOCs", tone: "info" },
          { label: "Recorded Future", value: "62k", tone: "info" },
          { label: "AlienVault OTX", value: "44k" },
          { label: "Abuse.ch", value: "31k" },
          { label: "Internal sandbox", value: "12k", tone: "healthy" },
        ],
      }}
    />
  ),
});
