import { createFileRoute } from "@tanstack/react-router";
import { Activity, Clock, Eye, FileText, KeyRound, User } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Log — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={KeyRound}
      eyebrow="Govern"
      title="Audit Log"
      description="Immutable, append-only audit trail for every console action, API call, and policy change within NEXUS."
      kpis={[
        { label: "Events / 24h", value: "84,210", icon: Activity, tone: "info", series: 120 },
        { label: "Unique actors", value: 218, icon: User, tone: "default" },
        { label: "Admin actions", value: 412, icon: KeyRound, tone: "high", series: 50 },
        { label: "Exports", value: 14, icon: FileText, tone: "info" },
        { label: "Retention", value: "7 years", icon: Clock, tone: "healthy" },
      ]}
      tableTitle="Recent audit events"
      columns={["Actor", "Action", "Resource", "IP", "When"]}
      rows={[
        { cells: ["k.morgan", "detection.rule.disabled", "rule:EDR-1042", "10.4.22.18", "1m ago"], severity: "high" },
        { cells: ["a.chen", "incident.assigned", "INC-1042", "10.4.22.31", "4m ago"], severity: "info" },
        { cells: ["api-token:ci-bot", "search.export", "events?q=ransom", "10.8.1.44", "12m ago"], severity: "medium" },
        { cells: ["root", "rbac.role.created", "role:auditor-ro", "192.0.2.55", "1h ago"], severity: "high" },
        { cells: ["m.patel", "integration.connected", "splunk-prod", "10.4.22.7", "2h ago"], severity: "info" },
        { cells: ["k.morgan", "user.mfa.reset", "j.lee", "10.4.22.18", "3h ago"], severity: "medium" },
      ]}
      rightPanel={{
        title: "Top actors",
        items: [
          { label: "k.morgan", value: "1,204 events" },
          { label: "a.chen", value: "812" },
          { label: "ci-bot (api)", value: "44k", tone: "info" },
          { label: "root", value: "12", tone: "high" },
          { label: "Tamper alerts", value: "0", tone: "healthy" },
        ],
      }}
    />
  ),
});
