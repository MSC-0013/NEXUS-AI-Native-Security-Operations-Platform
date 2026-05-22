import { createFileRoute } from "@tanstack/react-router";
import { Bell, Globe, Key, Palette, Settings as SettingsIcon, Shield } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={SettingsIcon}
      eyebrow="Govern"
      title="Settings"
      description="Workspace preferences, security policy, API keys, notifications, and regional configuration."
      kpis={[
        { label: "API keys", value: 14, icon: Key, tone: "info" },
        { label: "MFA enforced", value: "Yes", icon: Shield, tone: "healthy" },
        { label: "Notification channels", value: 8, icon: Bell, tone: "default" },
        { label: "Default region", value: "us-east-1", icon: Globe, tone: "info" },
        { label: "Theme", value: "Dark", icon: Palette, tone: "default" },
      ]}
      tableTitle="Configuration overview"
      columns={["Setting", "Scope", "Value", "Updated by", "When"]}
      rows={[
        { cells: ["Session timeout", "workspace", "30 min", "k.morgan", "2d ago"], severity: "info" },
        { cells: ["IP allow-list", "workspace", "12 ranges", "root", "5d ago"], severity: "high" },
        { cells: ["MFA requirement", "org", "WebAuthn or TOTP", "root", "21d ago"], severity: "healthy" },
        { cells: ["Data residency", "tenant", "US + EU", "root", "60d ago"], severity: "info" },
        { cells: ["Webhook signing key", "workspace", "rotated", "k.morgan", "7d ago"], severity: "medium" },
        { cells: ["AI Copilot", "workspace", "enabled", "k.morgan", "1d ago"], severity: "info" },
      ]}
      rightPanel={{
        title: "Subscription",
        items: [
          { label: "Plan", value: "Enterprise", tone: "info" },
          { label: "Seats", value: "218 / 500" },
          { label: "Ingest", value: "8.4 TB / 20 TB" },
          { label: "Retention", value: "90 days hot" },
          { label: "Renewal", value: "2026-09-30", tone: "healthy" },
        ],
      }}
    />
  ),
});
