import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownUp, Globe, Network, Radio, Wifi } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { useNetworkFlows, useDnsQueries } from "@/lib/api-hooks";
import type { SeverityLevel as Severity } from "@nexus/shared";

export const Route = createFileRoute("/_app/network")({
  head: () => ({ meta: [{ title: "Network â€” NEXUS" }] }),
  component: NetworkPage,
});

function NetworkPage() {
  const { data: flowsData, isLoading: flowsLoading } = useNetworkFlows();
  const { data: dnsData, isLoading: dnsLoading } = useDnsQueries();
  const flows = flowsData?.items ?? [];
  const dns = dnsData?.items ?? [];
  const malicious = flows.filter((f) => f.isMalicious).length;
  const dga = dns.filter((d) => d.isDga).length;
  const blocklisted = dns.filter((d) => d.isBlocklisted).length;

  return (
    <ModulePreview
      icon={Network}
      eyebrow="Detect"
      title="Network"
      description="East-west and egress traffic analytics, DNS anomalies, and C2 detection."
      kpis={[
        { label: "Active flows", value: flowsLoading ? "â€¦" : flows.length, icon: Activity, tone: "default" },
        { label: "Malicious flows", value: flowsLoading ? "â€¦" : malicious, icon: ArrowDownUp, tone: "critical" },
        { label: "DNS queries", value: dnsLoading ? "â€¦" : dns.length, icon: Globe, tone: "info" },
        { label: "DGA / blocklist", value: dnsLoading ? "â€¦" : dga + blocklisted, icon: Radio, tone: "high" },
        { label: "Sensors", value: "Live", icon: Wifi, tone: "healthy" },
      ]}
      tableTitle="Suspicious flows"
      columns={["Source", "Destination", "Proto", "When", "Verdict"]}
      rows={
        flows.length === 0 && !flowsLoading
          ? [{ cells: ["No flows", "â€”", "â€”", "â€”", "â€”"] }]
          : flows.slice(0, 8).map((f) => ({
              cells: [
                f.sourceIp,
                f.destinationIp,
                f.protocol ?? "â€”",
                new Date(f.flowStart).toLocaleString(),
                f.isMalicious ? "BLOCK" : "MONITOR",
              ],
              severity: (f.isMalicious ? "critical" : "medium") as Severity,
            }))
      }
      rightPanel={{
        title: "DNS highlights",
        items: dns.slice(0, 5).map((q) => ({
          label: q.domain,
          value: q.isDga ? "DGA" : q.isBlocklisted ? "Blocklist" : "OK",
          tone: q.isDga || q.isBlocklisted ? "critical" : undefined,
        })),
      }}
    />
  );
}

