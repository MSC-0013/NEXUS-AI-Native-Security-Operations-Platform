import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, Network, ShieldAlert, Skull, Target, Workflow } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/attack-graph")({
  head: () => ({ meta: [{ title: "Attack Graph — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={GitBranch}
      eyebrow="Investigate"
      title="Attack Graph"
      description="Interactive blast-radius graph mapping identities, assets, and vulnerabilities into exploitable attack paths."
      kpis={[
        { label: "Graph nodes", value: "184,210", icon: Network, tone: "info" },
        { label: "Edges", value: "1.4M", icon: Workflow, tone: "default" },
        { label: "Attack paths", value: 2812, icon: GitBranch, tone: "high", series: 80 },
        { label: "To crown jewels", value: 41, icon: Target, tone: "critical", series: 30, delta: { v: "5", up: true } },
        { label: "Choke points", value: 12, icon: ShieldAlert, tone: "high" },
      ]}
      tableTitle="Highest-risk attack paths"
      columns={["Entry", "→", "Target", "Hops", "Score"]}
      rows={[
        { cells: ["Internet → web-prod-12", "RCE → cred dump", "rds-prod-payments", 4, 98], severity: "critical" },
        { cells: ["Phish → finance-laptop-08", "MFA fatigue → Okta admin", "aws-prod root", 5, 95], severity: "critical" },
        { cells: ["Supply chain → build-runner-44", "Token leak → terraform-cloud", "all AWS accts", 3, 92], severity: "critical" },
        { cells: ["VPN → k.morgan session", "Privilege esc → vault token", "secrets vault", 4, 88], severity: "high" },
        { cells: ["Public S3 → leaked SAS key", "Lateral → SQL admin", "customer DB", 3, 84], severity: "high" },
      ]}
      rightPanel={{
        title: "Crown jewels",
        items: [
          { label: "rds-prod-payments", value: "41 paths", tone: "critical" },
          { label: "secrets-vault", value: "28 paths", tone: "high" },
          { label: "aws-prod root", value: "19 paths", tone: "critical" },
          { label: "customer-db", value: "12 paths", tone: "high" },
          { label: "kms-master-key", value: "7 paths" },
        ],
      }}
    />
  ),
});
