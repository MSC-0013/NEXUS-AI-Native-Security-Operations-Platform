import { createFileRoute } from "@tanstack/react-router";
import { Bot, BrainCircuit, MessageSquare, Sparkles, Wand2, Zap } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";

export const Route = createFileRoute("/_app/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — NEXUS" }] }),
  component: () => (
    <ModulePreview
      icon={Sparkles}
      eyebrow="Investigate"
      title="AI Copilot"
      description="Conversational analyst assistant — query in natural language, summarize incidents, generate detections, and orchestrate playbooks."
      kpis={[
        { label: "Sessions / 24h", value: 412, icon: MessageSquare, tone: "info", series: 80 },
        { label: "Auto-triaged", value: "1,204", icon: Bot, tone: "healthy", series: 100 },
        { label: "Detections drafted", value: 31, icon: Wand2, tone: "default" },
        { label: "Models active", value: 4, icon: BrainCircuit, tone: "info" },
        { label: "Avg. response", value: "1.8s", icon: Zap, tone: "healthy" },
      ]}
      tableTitle="Recent copilot activity"
      columns={["Analyst", "Prompt", "Action", "Tokens", "When"]}
      rows={[
        { cells: ["k.morgan", "Summarize INC-1042 and suggest containment", "Drafted runbook", "1,212", "2m ago"], severity: "info" },
        { cells: ["a.chen", "Find all logins from new ASNs last 24h", "SIEM query → 41 hits", "842", "11m ago"], severity: "medium" },
        { cells: ["soc-tier1", "Is CVE-2024-3094 reachable from internet?", "Graph traversal → 4 paths", "1,944", "32m ago"], severity: "high" },
        { cells: ["m.patel", "Write Sigma rule for LSASS access via rundll32", "Detection drafted", "2,118", "1h ago"], severity: "info" },
        { cells: ["soc-tier2", "Cluster 480 brute-force alerts", "Auto-merged → 12 incidents", "612", "2h ago"], severity: "medium" },
      ]}
      rightPanel={{
        title: "Models",
        items: [
          { label: "nexus-analyst-v3", value: "primary", tone: "healthy" },
          { label: "nexus-rca-v2", value: "RCA" },
          { label: "nexus-detector-v1", value: "rule synth" },
          { label: "embedding-large", value: "retrieval" },
          { label: "Daily spend", value: "$48.20", tone: "info" },
        ],
      }}
    />
  ),
});
