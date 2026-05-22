export type Severity = "critical" | "high" | "medium" | "info" | "healthy";

export type EventType =
  | "failed_login"
  | "malware_detection"
  | "suspicious_process"
  | "dns_anomaly"
  | "privilege_escalation"
  | "suspicious_api"
  | "iam_change"
  | "data_exfiltration"
  | "brute_force"
  | "ransomware";

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: EventType;
  severity: Severity;
  source: string;
  sourceIp: string;
  destIp: string;
  user: string;
  host: string;
  rule: string;
  message: string;
  country: string;
  asset: string;
  mitre: string;
  raw: Record<string, unknown>;
}

export type IncidentStatus = "open" | "investigating" | "contained" | "resolved";

export interface Incident {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  assignee: string;
  openedAt: string;
  updatedAt: string;
  affectedAssets: number;
  affectedUsers: number;
  category: string;
  mitre: string[];
  summary: string;
  timeline: { at: string; actor: string; action: string; detail?: string }[];
  rca: string;
  recommendations: string[];
  linkedEventIds: string[];
}

export interface MetricPoint { t: number; v: number; }
