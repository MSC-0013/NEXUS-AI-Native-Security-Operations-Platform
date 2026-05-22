import { createFileRoute } from "@tanstack/react-router";
import { Cloud, CloudOff, Database, Lock, Server, ShieldAlert } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/cloud-security")({
  head: () => ({ meta: [{ title: "Cloud Security — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Cloud}
      eyebrow="Detect"
      title="Cloud Security"
      description="CSPM, CIEM, and workload posture across AWS, Azure, and GCP — misconfigurations, exposures, and toxic combinations."
      kpis={[
        { label: "Accounts", value: 47, icon: Server, tone: "default" },
        { label: "Resources", value: "184k", icon: Database, tone: "info", series: 200 },
        { label: "Critical findings", value: 312, icon: ShieldAlert, tone: "critical", series: 50, delta: { v: "11", up: true } },
        { label: "Public buckets", value: 8, icon: CloudOff, tone: "high" },
        { label: "Encrypted (rest)", value: "99.1%", icon: Lock, tone: "healthy" },
      ]}
      tableTitle="Top cloud misconfigurations"
      columns={["Finding", "Cloud", "Account", "Resource", "Age"]}
      rows={[
        { cells: ["S3 bucket public-readable w/ PII", "AWS", "prod-data-872", "s3://acme-analytics-raw", "2d"], severity: "critical" },
        { cells: ["RDS snapshot shared publicly", "AWS", "prod-data-872", "snap-0af23…", "5h"], severity: "critical" },
        { cells: ["GCS bucket allUsers viewer", "GCP", "growth-prod", "gs://acme-reports", "1d"], severity: "high" },
        { cells: ["Storage account w/o private endpoint", "Azure", "corp-it-01", "saacmecorp01", "3d"], severity: "high" },
        { cells: ["IAM user with AdministratorAccess", "AWS", "sandbox-12", "deploy-bot", "12d"], severity: "high" },
        { cells: ["EKS cluster public API endpoint", "AWS", "platform-eu", "eks-prod-eu-1", "1d"], severity: "medium" },
      ]}
      rightPanel={{
        title: "By provider",
        items: [
          { label: "AWS", value: "29 accts" },
          { label: "Azure", value: "12 subs" },
          { label: "GCP", value: "6 projects" },
          { label: "Critical exposures", value: "312", tone: "critical" },
          { label: "Auto-remediated", value: "1,204", tone: "healthy" },
        ],
      }}
    />
  ),
});
