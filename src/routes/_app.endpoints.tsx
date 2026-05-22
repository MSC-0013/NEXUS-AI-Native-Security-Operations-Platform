import { createFileRoute } from "@tanstack/react-router";
import { Cpu, HardDrive, Laptop, ShieldCheck, WifiOff, Boxes } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Boxes}
      eyebrow="Detect"
      title="Endpoints"
      description="Managed device fleet with EDR posture, agent health, and policy compliance across OS families."
      kpis={[
        { label: "Total endpoints", value: "12,847", icon: Laptop, tone: "default", series: 80 },
        { label: "Healthy", value: "11,902", icon: ShieldCheck, tone: "healthy", series: 60 },
        { label: "At risk", value: 612, icon: Cpu, tone: "high", series: 50, delta: { v: "4%", up: true } },
        { label: "Offline > 7d", value: 188, icon: WifiOff, tone: "info" },
        { label: "Quarantined", value: 145, icon: HardDrive, tone: "critical" },
      ]}
      tableTitle="Recently flagged endpoints"
      columns={["Hostname", "OS", "User", "Risk", "Last check-in"]}
      rows={[
        { cells: ["web-prod-12.nyc", "Ubuntu 22.04", "svc-nginx", 94, "2m ago"], severity: "critical" },
        { cells: ["finance-laptop-08", "Windows 11", "k.morgan", 87, "4m ago"], severity: "high" },
        { cells: ["build-runner-44", "Debian 12", "ci-bot", 78, "11m ago"], severity: "high" },
        { cells: ["mac-design-21", "macOS 14.5", "j.lee", 56, "32m ago"], severity: "medium" },
        { cells: ["legacy-fileshare-02", "Windows Server 2016", "—", 71, "1h ago"], severity: "high" },
        { cells: ["k8s-node-prod-09", "Bottlerocket", "kubelet", 34, "1m ago"], severity: "info" },
      ]}
      rightPanel={{
        title: "OS distribution",
        items: [
          { label: "Windows", value: "6,124" },
          { label: "macOS", value: "3,402" },
          { label: "Linux", value: "2,901" },
          { label: "iOS / Android", value: "420" },
          { label: "Agent v14.x", value: "98.2%", tone: "healthy" },
        ],
      }}
    />
  ),
});
