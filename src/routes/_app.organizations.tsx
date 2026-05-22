import { createFileRoute } from "@tanstack/react-router";
import { Building2, Crown, Globe, Shield, Users, UserPlus } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/organizations")({
  head: () => ({ meta: [{ title: "Organization — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Users}
      eyebrow="Govern"
      title="Organization"
      description="Tenants, workspaces, teams, and role assignments across the NEXUS deployment."
      kpis={[
        { label: "Workspaces", value: 12, icon: Building2, tone: "default" },
        { label: "Members", value: 218, icon: Users, tone: "info" },
        { label: "Pending invites", value: 7, icon: UserPlus, tone: "high" },
        { label: "Owners", value: 4, icon: Crown, tone: "critical" },
        { label: "Regions", value: 3, icon: Globe, tone: "healthy" },
      ]}
      tableTitle="Workspace members"
      columns={["Name", "Email", "Role", "Workspaces", "Last active"]}
      rows={[
        { cells: ["Kira Morgan", "k.morgan@acme.io", "SOC Lead", "prod, eu, sandbox", "2m ago"], severity: "healthy" },
        { cells: ["Aisha Chen", "a.chen@acme.io", "Tier 2 Analyst", "prod", "12m ago"], severity: "info" },
        { cells: ["Marco Patel", "m.patel@acme.io", "Detection Eng.", "prod, sandbox", "1h ago"], severity: "info" },
        { cells: ["Jordan Lee", "j.lee@acme.io", "Cloud Sec", "prod, eu", "4h ago"], severity: "info" },
        { cells: ["Root Admin", "root@acme.io", "Owner", "all", "1d ago"], severity: "high" },
      ]}
      rightPanel={{
        title: "Role distribution",
        items: [
          { label: "Owner", value: "4", tone: "critical" },
          { label: "Admin", value: "12", tone: "high" },
          { label: "SOC Lead", value: "8" },
          { label: "Analyst", value: "144", tone: "info" },
          { label: "Read-only", value: "50", tone: "healthy" },
        ],
      }}
    />
  ),
});
