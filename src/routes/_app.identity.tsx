import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, KeyRound, ShieldOff, UserCheck, UserX, Users } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/identity")({
  head: () => ({ meta: [{ title: "Identity — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Fingerprint}
      eyebrow="Detect"
      title="Identity"
      description="Identity threat detection across SSO, IdP, and privileged access — anomalous sessions, impossible travel, MFA fatigue."
      kpis={[
        { label: "Identities", value: "8,412", icon: Users, tone: "default", series: 70 },
        { label: "Privileged", value: 214, icon: KeyRound, tone: "high" },
        { label: "MFA enrolled", value: "97.4%", icon: UserCheck, tone: "healthy" },
        { label: "Risky sessions", value: 31, icon: ShieldOff, tone: "critical", series: 40, delta: { v: "3", up: true } },
        { label: "Disabled (30d)", value: 142, icon: UserX, tone: "info" },
      ]}
      tableTitle="High-risk identity events"
      columns={["User", "Signal", "Source IP", "Geo", "When"]}
      rows={[
        { cells: ["k.morgan@acme.io", "Impossible travel (NY → SG)", "203.0.113.42", "SG", "3m ago"], severity: "critical" },
        { cells: ["svc-deploy", "Token used from new ASN", "185.220.101.7", "RU", "8m ago"], severity: "high" },
        { cells: ["a.chen@acme.io", "MFA fatigue (12 prompts)", "10.4.22.18", "US", "14m ago"], severity: "high" },
        { cells: ["root@aws-prod", "Console login from TOR exit", "171.25.193.20", "—", "32m ago"], severity: "critical" },
        { cells: ["m.patel@acme.io", "New device + privileged role", "192.0.2.55", "IN", "1h ago"], severity: "medium" },
      ]}
      rightPanel={{
        title: "Top providers",
        items: [
          { label: "Okta", value: "5,210", tone: "info" },
          { label: "Azure AD", value: "2,418" },
          { label: "Google Workspace", value: "612" },
          { label: "AWS IAM", value: "172" },
          { label: "Local accounts", value: "0", tone: "healthy" },
        ],
      }}
    />
  ),
});
