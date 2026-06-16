/**
 * Shared UI-only type definitions.
 *
 * These describe rich view-model shapes used by presentational components
 * (e.g. the Inspector panel) that are broader than the API DTOs. They contain
 * NO data — only type declarations. Live data always comes from the API.
 */
import type {
  SeverityLevel,
  ActorOrigin,
  ExploitStatus,
  PatchStatus,
} from "@nexus/shared";

export type Severity = SeverityLevel;

export type EndpointOS = "windows" | "linux" | "macos";

export interface RiskScoreBreakdown {
  overall: number;
  malware: number;
  network: number;
  credential: number;
  behavior: number;
}

export interface Endpoint {
  id: string;
  hostname: string;
  os: EndpointOS;
  riskScore: RiskScoreBreakdown;
  agentVersion: string;
  lastCheckIn: string;
  isolated: boolean;
  malwareIndicators: string[];
  sessionCount: number;
  ip: string;
  tags: string[];
}

export interface Vulnerability {
  id: string;
  cve: string;
  cvss: number;
  epss: number;
  affectedPackages: string[];
  assetCount: number;
  patchStatus: Extract<PatchStatus, "unpatched" | "patch_available" | "patched">;
  exploitStatus: Extract<ExploitStatus, "none" | "poc" | "active" | "weaponized">;
  severity: Severity;
  publishedAt: string;
  description: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  origin: ActorOrigin;
  motivation: string[];
  ttps: string[];
  aliases: string[];
  activityTimeline: { date: string; event: string }[];
  linkedCampaigns: string[];
  lastSeen: string;
  severity: Severity;
}

export interface MetricPoint {
  t: number;
  v: number;
}
