import { create } from "zustand";

export type EntityType = "event" | "alert" | "incident" | "endpoint" | "vulnerability" | "actor" | "cloud_asset" | "case" | "policy";

export interface CorrelationNode {
  id: string;
  type: EntityType;
  label: string;
  severity: "critical" | "high" | "medium" | "info" | "healthy";
  metadata: Record<string, string>;
}

export interface CorrelationEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number;
  context: string;
}

export interface CorrelationResult {
  centerId: string;
  centerType: EntityType;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
  aiSummary: string;
  riskImpact: "critical" | "high" | "medium" | "low";
  blastRadius: number;
  timestamp: Date;
}

const CORRELATIONS: Record<string, CorrelationResult> = {
  "INC-2847": {
    centerId: "INC-2847",
    centerType: "incident",
    nodes: [
      { id: "INC-2847", type: "incident", label: "INC-2847 Lateral Movement", severity: "critical", metadata: { status: "active", assignee: "Sarah Chen" } },
      { id: "ALT-4291", type: "alert", label: "Suspicious PowerShell", severity: "high", metadata: { rule: "PwrShell-Exec", source: "EDR" } },
      { id: "ALT-4302", type: "alert", label: "Anomalous DNS Beaconing", severity: "high", metadata: { rule: "DNS-Beacon", source: "Network" } },
      { id: "ALT-4315", type: "alert", label: "Cobalt Strike C2 Callback", severity: "critical", metadata: { rule: "CS-C2", source: "Firewall" } },
      { id: "ep-prod-web-01", type: "endpoint", label: "prod-web-01", severity: "critical", metadata: { os: "Windows Server 2022", risk: "92" } },
      { id: "ep-prod-db-03", type: "endpoint", label: "prod-db-03", severity: "high", metadata: { os: "RHEL 9", risk: "67" } },
      { id: "CVE-2025-3192", type: "vulnerability", label: "CVE-2025-3192 Log4Shell RCE", severity: "critical", metadata: { cvss: "10.0", weaponized: "true" } },
      { id: "APT-29", type: "actor", label: "APT29 (Cozy Bear)", severity: "critical", metadata: { origin: "Russia", motivation: "Espionage" } },
      { id: "cloud-rds-snap", type: "cloud_asset", label: "RDS Snapshot Exposed", severity: "high", metadata: { provider: "AWS", region: "us-east-1" } },
      { id: "CASE-7001", type: "case", label: "CASE-7001 APT Investigation", severity: "critical", metadata: { status: "in_progress" } },
    ],
    edges: [
      { source: "CVE-2025-3192", target: "ep-prod-web-01", relationship: "exploited", strength: 0.95, context: "Log4Shell RCE on web server" },
      { source: "ep-prod-web-01", target: "ALT-4291", relationship: "triggered", strength: 0.9, context: "PowerShell spawned from w3wp.exe" },
      { source: "ep-prod-web-01", target: "ALT-4302", relationship: "triggered", strength: 0.85, context: "DNS beaconing to C2 domain" },
      { source: "ALT-4302", target: "APT-29", relationship: "attributed_to", strength: 0.78, context: "C2 domain matches APT29 infrastructure" },
      { source: "ep-prod-web-01", target: "ep-prod-db-03", relationship: "lateral_movement", strength: 0.88, context: "SMB auth from web to DB server" },
      { source: "ALT-4291", target: "INC-2847", relationship: "escalated_to", strength: 1.0, context: "Alert escalated to incident" },
      { source: "ALT-4315", target: "INC-2847", relationship: "escalated_to", strength: 1.0, context: "C2 detection escalated" },
      { source: "INC-2847", target: "CASE-7001", relationship: "tracked_in", strength: 1.0, context: "Case opened for investigation" },
      { source: "ep-prod-db-03", target: "cloud-rds-snap", relationship: "contains", strength: 0.7, context: "DB server has exposed RDS snapshot" },
      { source: "APT-29", target: "CVE-2025-3192", relationship: "uses", strength: 0.82, context: "Known to exploit Log4Shell variants" },
      { source: "ALT-4315", target: "APT-29", relationship: "attributed_to", strength: 0.91, context: "Cobalt Strike callback to known APT29 IP" },
    ],
    aiSummary: "High-confidence correlation: APT29 likely exploited CVE-2025-3192 (Log4Shell) on prod-web-01, established C2 via DNS beaconing, then moved laterally to prod-db-03 using SMB. Exposed RDS snapshot increases blast radius. Immediate containment of prod-web-01 recommended.",
    riskImpact: "critical",
    blastRadius: 9,
    timestamp: new Date(),
  },
  "ep-prod-web-01": {
    centerId: "ep-prod-web-01",
    centerType: "endpoint",
    nodes: [
      { id: "ep-prod-web-01", type: "endpoint", label: "prod-web-01", severity: "critical", metadata: { os: "Windows Server 2022", risk: "92" } },
      { id: "CVE-2025-3192", type: "vulnerability", label: "CVE-2025-3192 Log4Shell", severity: "critical", metadata: { cvss: "10.0" } },
      { id: "CVE-2025-4410", type: "vulnerability", label: "CVE-2025-4410 Privilege Escalation", severity: "high", metadata: { cvss: "7.8" } },
      { id: "ALT-4291", type: "alert", label: "Suspicious PowerShell", severity: "high", metadata: { rule: "PwrShell-Exec" } },
      { id: "ALT-4302", type: "alert", label: "DNS Beaconing", severity: "high", metadata: { rule: "DNS-Beacon" } },
      { id: "INC-2847", type: "incident", label: "INC-2847 Lateral Movement", severity: "critical", metadata: { status: "active" } },
      { id: "cloud-ec2-web", type: "cloud_asset", label: "EC2 i-0abc123 (Web Tier)", severity: "high", metadata: { provider: "AWS" } },
      { id: "cloud-sg-web", type: "cloud_asset", label: "SG sg-web-open", severity: "critical", metadata: { type: "Security Group", exposure: "public" } },
    ],
    edges: [
      { source: "CVE-2025-3192", target: "ep-prod-web-01", relationship: "exploited", strength: 0.95, context: "Log4Shell RCE" },
      { source: "ep-prod-web-01", target: "ALT-4291", relationship: "triggered", strength: 0.9, context: "PowerShell execution" },
      { source: "ep-prod-web-01", target: "ALT-4302", relationship: "triggered", strength: 0.85, context: "DNS C2 beaconing" },
      { source: "ALT-4291", target: "INC-2847", relationship: "escalated_to", strength: 1.0, context: "Alert escalated" },
      { source: "cloud-sg-web", target: "ep-prod-web-01", relationship: "exposes", strength: 0.9, context: "Overly permissive security group" },
      { source: "cloud-ec2-web", target: "ep-prod-web-01", relationship: "hosts", strength: 1.0, context: "EC2 instance" },
      { source: "CVE-2025-4410", target: "ep-prod-web-01", relationship: "affects", strength: 0.65, context: "Local privilege escalation" },
    ],
    aiSummary: "prod-web-01 is the initial access point in an active APT29 campaign. Two critical vulnerabilities, three active alerts, and a permissive security group make this the highest-risk asset. Immediate isolation recommended.",
    riskImpact: "critical",
    blastRadius: 7,
    timestamp: new Date(),
  },
  "CVE-2025-3192": {
    centerId: "CVE-2025-3192",
    centerType: "vulnerability",
    nodes: [
      { id: "CVE-2025-3192", type: "vulnerability", label: "CVE-2025-3192 Log4Shell RCE", severity: "critical", metadata: { cvss: "10.0", epss: "0.97" } },
      { id: "ep-prod-web-01", type: "endpoint", label: "prod-web-01", severity: "critical", metadata: { risk: "92" } },
      { id: "ep-dev-api-02", type: "endpoint", label: "dev-api-02", severity: "high", metadata: { risk: "61" } },
      { id: "ep-staging-app-01", type: "endpoint", label: "staging-app-01", severity: "medium", metadata: { risk: "38" } },
      { id: "ALT-4291", type: "alert", label: "Suspicious PowerShell", severity: "high", metadata: {} },
      { id: "ALT-4315", type: "alert", label: "C2 Callback", severity: "critical", metadata: {} },
      { id: "APT-29", type: "actor", label: "APT29", severity: "critical", metadata: { origin: "Russia" } },
    ],
    edges: [
      { source: "CVE-2025-3192", target: "ep-prod-web-01", relationship: "exploited", strength: 0.95, context: "Confirmed exploitation" },
      { source: "CVE-2025-3192", target: "ep-dev-api-02", relationship: "affects", strength: 0.7, context: "Vulnerable version detected" },
      { source: "CVE-2025-3192", target: "ep-staging-app-01", relationship: "affects", strength: 0.6, context: "Vulnerable version detected" },
      { source: "ep-prod-web-01", target: "ALT-4291", relationship: "triggered", strength: 0.9, context: "Post-exploitation activity" },
      { source: "ep-prod-web-01", target: "ALT-4315", relationship: "triggered", strength: 0.95, context: "C2 established" },
      { source: "APT-29", target: "CVE-2025-3192", relationship: "uses", strength: 0.82, context: "Known exploit user" },
    ],
    aiSummary: "CVE-2025-3192 is actively exploited in the wild by APT29. 3 endpoints affected, 1 confirmed compromised. Patch immediately — EPSS probability 97%.",
    riskImpact: "critical",
    blastRadius: 6,
    timestamp: new Date(),
  },
  "ALT-4291": {
    centerId: "ALT-4291",
    centerType: "alert",
    nodes: [
      { id: "ALT-4291", type: "alert", label: "Suspicious PowerShell Execution", severity: "high", metadata: { rule: "PwrShell-Exec", aiPriority: "87" } },
      { id: "ep-prod-web-01", type: "endpoint", label: "prod-web-01", severity: "critical", metadata: { risk: "92" } },
      { id: "INC-2847", type: "incident", label: "INC-2847", severity: "critical", metadata: { status: "active" } },
      { id: "ALT-4302", type: "alert", label: "DNS Beaconing", severity: "high", metadata: {} },
      { id: "CVE-2025-3192", type: "vulnerability", label: "CVE-2025-3192", severity: "critical", metadata: {} },
    ],
    edges: [
      { source: "ep-prod-web-01", target: "ALT-4291", relationship: "triggered", strength: 0.9, context: "PowerShell from w3wp.exe" },
      { source: "ALT-4291", target: "INC-2847", relationship: "escalated_to", strength: 1.0, context: "Escalated to incident" },
      { source: "CVE-2025-3192", target: "ALT-4291", relationship: "root_cause", strength: 0.85, context: "Exploit led to shell execution" },
      { source: "ALT-4291", target: "ALT-4302", relationship: "correlated", strength: 0.75, context: "Same endpoint, same timeframe" },
    ],
    aiSummary: "Alert ALT-4291 is part of a confirmed APT29 intrusion chain. PowerShell execution followed Log4Shell exploitation on prod-web-01. Already escalated to INC-2847.",
    riskImpact: "high",
    blastRadius: 4,
    timestamp: new Date(),
  },
};

interface CorrelationState {
  getCorrelations: (entityId: string, entityType?: EntityType) => CorrelationResult | null;
  getRelatedEntities: (entityId: string) => CorrelationNode[];
  getCorrelationStats: () => { byRelationship: Record<string, number>; byType: Record<EntityType, number>; totalEdges: number };
}

export const useCorrelationStore = create<CorrelationState>((_set, get) => ({
  getCorrelations: (entityId, _entityType) => CORRELATIONS[entityId] ?? null,
  getRelatedEntities: (entityId) => {
    const result = CORRELATIONS[entityId];
    if (!result) return [];
    return result.nodes.filter((n) => n.id !== entityId);
  },
  getCorrelationStats: () => {
    const byRelationship: Record<string, number> = {};
    const byType: Record<EntityType, number> = {} as Record<EntityType, number>;
    let totalEdges = 0;
    for (const result of Object.values(CORRELATIONS)) {
      for (const edge of result.edges) {
        byRelationship[edge.relationship] = (byRelationship[edge.relationship] ?? 0) + 1;
        totalEdges++;
      }
      for (const node of result.nodes) {
        byType[node.type] = (byType[node.type] ?? 0) + 1;
      }
    }
    return { byRelationship, byType, totalEdges };
  },
}));
