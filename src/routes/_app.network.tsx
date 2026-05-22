import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownUp, Globe, Network, Radio, Wifi } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/network")({
  head: () => ({ meta: [{ title: "Network — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Network}
      eyebrow="Detect"
      title="Network"
      description="East-west and egress traffic analytics, DNS anomalies, and C2 detection via Zeek and Suricata sensors."
      kpis={[
        { label: "Throughput", value: "4.2 Gb/s", icon: ArrowDownUp, tone: "info", series: 120 },
        { label: "Active flows", value: "1.2M", icon: Activity, tone: "default", series: 100 },
        { label: "DNS queries / s", value: "84k", icon: Globe, tone: "info", series: 90 },
        { label: "Anomalies / 1h", value: 218, icon: Radio, tone: "high", series: 60, delta: { v: "9%", up: true } },
        { label: "Sensors online", value: "62/64", icon: Wifi, tone: "healthy" },
      ]}
      tableTitle="Suspicious flows"
      columns={["Source", "Destination", "Proto", "Bytes", "Verdict"]}
      rows={[
        { cells: ["10.4.22.18", "185.220.101.7:443 (TOR)", "TCP/TLS", "12.4 MB", "BLOCK"], severity: "critical" },
        { cells: ["10.8.1.44", "104.21.x.x:443 (CDN)", "TCP/TLS", "812 MB", "INVESTIGATE"], severity: "high" },
        { cells: ["10.4.22.31", "8.8.8.8:53 (DGA)", "UDP/DNS", "1.2 KB", "ALERT"], severity: "medium" },
        { cells: ["10.12.0.9", "203.0.113.42:6667", "TCP", "44 KB", "BLOCK"], severity: "high" },
        { cells: ["172.16.4.2", "internal-fileserver:445", "SMB", "2.1 GB", "ALERT"], severity: "medium" },
      ]}
      rightPanel={{
        title: "Top destinations",
        items: [
          { label: "github.com", value: "1.4 TB" },
          { label: "*.amazonaws.com", value: "812 GB" },
          { label: "*.cloudflare.net", value: "402 GB" },
          { label: "Unknown ASN", value: "11 GB", tone: "high" },
          { label: "Known C2", value: "44 MB", tone: "critical" },
        ],
      }}
    />
  ),
});
