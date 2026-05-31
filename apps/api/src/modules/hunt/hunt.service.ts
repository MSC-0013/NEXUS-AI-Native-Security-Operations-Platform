import type postgres from "postgres";
import type { DbClient } from "@nexus/db";
import { withTenant } from "../../lib/tenant.js";

export interface HuntQueryDto {
  id: string;
  name: string;
  description: string;
  query: string;
  frequency: string;
  lastRun: string;
  hits: number;
  severity: "critical" | "high" | "medium" | "info";
}

export interface HuntAnomalyDto {
  id: string;
  type: string;
  description: string;
  baseline: number;
  observed: number;
  deviation: number;
  assets: string[];
  severity: "critical" | "high" | "medium";
  confidence: number;
}

export interface HuntResultDto {
  time: string;
  src: string;
  dst: string;
  bytes: string;
  proto: string;
}

const QUERIES: HuntQueryDto[] = [
  { id: "hq-1", name: "Cobalt Strike C2 Beaconing", description: "Detect periodic DNS callbacks to known C2 infrastructure", query: "event_type:network DNS WHERE frequency > 5/min AND domain.age < 7d", frequency: "1h", lastRun: new Date(Date.now() - 1800000).toISOString(), hits: 3, severity: "critical" },
  { id: "hq-2", name: "Lateral Movement via SMB", description: "SMB authentication from non-standard sources", query: "event_type:auth protocol:SMB WHERE src != $internal_subnets AND action:success", frequency: "15m", lastRun: new Date(Date.now() - 600000).toISOString(), hits: 7, severity: "high" },
  { id: "hq-3", name: "Living-off-the-Land Binaries", description: "LOLBAS execution from suspicious parent processes", query: "event_type:process WHERE name IN (certutil,mshta,mavinject) AND parent != explorer.exe", frequency: "5m", lastRun: new Date(Date.now() - 300000).toISOString(), hits: 1, severity: "high" },
  { id: "hq-4", name: "After-Hours Data Exfiltration", description: "Large outbound transfers outside business hours", query: "event_type:network bytes_out > 100MB WHERE timestamp.hour NOT IN (8..18)", frequency: "30m", lastRun: new Date(Date.now() - 900000).toISOString(), hits: 2, severity: "medium" },
  { id: "hq-5", name: "Privilege Escalation Attempts", description: "Users escalating to admin roles outside change windows", query: "event_type:iam action:role_assume WHERE role:admin AND change_window:false", frequency: "10m", lastRun: new Date(Date.now() - 1200000).toISOString(), hits: 0, severity: "high" },
  { id: "hq-6", name: "Ransomware Precursor Activity", description: "vssadmin delete, bcdedit, wbadmin disable patterns", query: "event_type:process WHERE cmdline CONTAINS (vssadmin delete, bcdedit /restore, wbadmin disable)", frequency: "5m", lastRun: new Date(Date.now() - 420000).toISOString(), hits: 0, severity: "critical" },
];

const ANOMALIES: HuntAnomalyDto[] = [
  { id: "an-1", type: "Network Volume", description: "Unusual egress from prod-db-03", baseline: 50, observed: 2400, deviation: 4800, assets: ["prod-db-03"], severity: "critical", confidence: 0.94 },
  { id: "an-2", type: "Auth Pattern", description: "3 users accessing resources after hours", baseline: 0, observed: 3, deviation: 100, assets: ["u-chen", "u-miller", "u-rivera"], severity: "high", confidence: 0.82 },
  { id: "an-3", type: "Process Behavior", description: "PowerShell from web worker process", baseline: 0, observed: 1, deviation: 100, assets: ["prod-web-01"], severity: "critical", confidence: 0.97 },
  { id: "an-4", type: "IAM Changes", description: "Rapid role escalation sequence", baseline: 1, observed: 8, deviation: 700, assets: ["iam-role-lambda"], severity: "high", confidence: 0.76 },
  { id: "an-5", type: "DNS Pattern", description: "Periodic beaconing to new domain", baseline: 2, observed: 45, deviation: 2150, assets: ["prod-web-01", "dns-resolver"], severity: "high", confidence: 0.89 },
  { id: "an-6", type: "File Activity", description: "Mass file encryption on dev-workstation", baseline: 0, observed: 1, deviation: 100, assets: ["dev-ws-05"], severity: "critical", confidence: 0.99 },
];

const RESULTS: HuntResultDto[] = [
  { time: "14:23:01", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.4MB", proto: "DNS" },
  { time: "14:23:31", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.1MB", proto: "DNS" },
  { time: "14:24:01", src: "prod-web-01", dst: "185.220.101.34", bytes: "2.3MB", proto: "DNS" },
  { time: "14:26:12", src: "prod-web-02", dst: "cdn-assets.cloudfront-update.info", bytes: "1.1MB", proto: "HTTPS" },
  { time: "14:28:05", src: "prod-db-03", dst: "10.0.6.21", bytes: "98MB", proto: "SMB" },
];

export class HuntService {
  constructor(private db: DbClient, private client: postgres.Sql) {}

  async listQueries(orgId: string) {
    return withTenant(this.client, orgId, async () => QUERIES);
  }

  async listAnomalies(orgId: string) {
    return withTenant(this.client, orgId, async () => ANOMALIES);
  }

  async executeQuery(orgId: string, query: string, limit = 25) {
    return withTenant(this.client, orgId, async () => {
      const normalized = (query ?? "").trim().toLowerCase();
      if (!normalized) return RESULTS.slice(0, limit);

      if (normalized.includes("ransomware") || normalized.includes("vssadmin") || normalized.includes("payload")) {
        return RESULTS.filter((row) => row.dst.includes("185.220.101.34") || row.src.includes("prod-web-01")).slice(0, limit);
      }

      if (normalized.includes("dns") || normalized.includes("domain")) {
        return RESULTS.filter((row) => row.proto === "DNS").slice(0, limit);
      }

      if (normalized.includes("smb") || normalized.includes("bytes_out")) {
        return RESULTS.filter((row) => row.proto === "SMB").slice(0, limit);
      }

      return RESULTS.slice(0, limit);
    });
  }
}
