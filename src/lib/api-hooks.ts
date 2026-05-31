import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type {
  SecurityEventDto,
  IncidentDto,
  AlertDto,
  DashboardStats,
  ExecutiveSummary,
  AlertRuleDto,
  SecurityEventListQuery,
  IncidentListQuery,
  AlertListQuery,
} from "@nexus/shared";

const defaultQueryOpts = { staleTime: 15_000, retry: 1 };

function buildParams(params: Record<string, string | number | undefined>, arrays?: Record<string, string[]>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  if (arrays) {
    for (const [k, vals] of Object.entries(arrays)) {
      vals?.forEach((v) => sp.append(k, v));
    }
  }
  return sp.toString();
}

export function useEvents(filters: Partial<SecurityEventListQuery> = {}) {
  const qs = buildParams(
    { limit: filters.limit, search: filters.search, since: filters.since },
    { severity: filters.severity },
  );
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => apiFetch<{ items: SecurityEventDto[]; nextCursor: string | null }>(`/v1/events?${qs}`),
    ...defaultQueryOpts,
  });
}

export function useIncidents(filters: Partial<IncidentListQuery> = {}) {
  const qs = buildParams(
    { limit: filters.limit, search: filters.search },
    { status: filters.status, severity: filters.severity },
  );
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => apiFetch<{ items: IncidentDto[]; nextCursor: string | null }>(`/v1/incidents?${qs}`),
    ...defaultQueryOpts,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => apiFetch<IncidentDto>(`/v1/incidents/${id}`),
    enabled: !!id,
    ...defaultQueryOpts,
  });
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<IncidentDto>(`/v1/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident", id] });
    },
  });
}

export function useAlerts(filters: Partial<AlertListQuery> = {}) {
  const qs = buildParams(
    { limit: filters.limit },
    { severity: filters.severity, status: filters.status },
  );
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => apiFetch<{ items: AlertDto[]; nextCursor: string | null }>(`/v1/alerts?${qs}`),
    ...defaultQueryOpts,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AlertDto>(`/v1/alerts/${id}/acknowledge`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch<DashboardStats>("/v1/dashboard/stats"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useExecutiveSummary() {
  return useQuery({
    queryKey: ["dashboard", "executive"],
    queryFn: () => apiFetch<ExecutiveSummary>("/v1/dashboard/executive"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["detection-rules"],
    queryFn: () => apiFetch<{ items: AlertRuleDto[] }>("/v1/detection-rules"),
    ...defaultQueryOpts,
  });
}

export function useIncidentTimeline(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "timeline"],
    queryFn: () =>
      apiFetch<{ items: { id: string; at: string; actor: string; action: string; detail: string }[] }>(
        `/v1/incidents/${incidentId}/timeline`,
      ),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useIncidentComments(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "comments"],
    queryFn: () =>
      apiFetch<{ items: { id: string; content: string; author: string; createdAt?: string }[] }>(
        `/v1/incidents/${incidentId}/comments`,
      ),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useIncidentEvidence(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "evidence"],
    queryFn: () =>
      apiFetch<{ items: { id: string; type: string; title: string; fileName?: string | null; addedAt?: string }[] }>(
        `/v1/incidents/${incidentId}/evidence`,
      ),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useCopilotSessions() {
  return useQuery({
    queryKey: ["copilot", "sessions"],
    queryFn: () =>
      apiFetch<{ items: { id: string; title: string | null; messageCount: number; updatedAt: string }[] }>(
        "/v1/copilot/sessions",
      ),
    ...defaultQueryOpts,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/v1/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; reportType: string }) =>
      apiFetch("/v1/reports", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useOrgUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () =>
      apiFetch<{ items: { id: string; email: string; fullName: string; status: string }[] }>("/v1/users"),
    ...defaultQueryOpts,
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      apiFetch<{ items: { id: string; label: string; title: string; type: string }[] }>(
        `/v1/search?q=${encodeURIComponent(q)}`,
      ),
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}

export function useEndpoints(search?: string) {
  return useQuery({
    queryKey: ["endpoints", search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{ items: EndpointApi[] }>(`/v1/endpoints${qs}`);
    },
    ...defaultQueryOpts,
  });
}

export function useVulnerabilities(search?: string) {
  return useQuery({
    queryKey: ["vulnerabilities", search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{ items: VulnerabilityApi[] }>(`/v1/vulnerabilities${qs}`);
    },
    ...defaultQueryOpts,
  });
}

export function useThreatActors(search?: string) {
  return useQuery({
    queryKey: ["threat-actors", search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{ items: ThreatActorApi[] }>(`/v1/threat-intel/actors${qs}`);
    },
    ...defaultQueryOpts,
  });
}

export function useThreatIocs() {
  return useQuery({
    queryKey: ["threat-iocs"],
    queryFn: () => apiFetch<{ items: IocApi[] }>("/v1/threat-intel/iocs"),
    ...defaultQueryOpts,
  });
}

export function useThreatRansomware() {
  return useQuery({
    queryKey: ["threat-ransomware"],
    queryFn: () => apiFetch<{ items: { id: string; name: string; encryption: string; sectors: string[]; recentVictims: string[]; severity: string; active: boolean }[] }>("/v1/threat-intel/ransomware"),
    ...defaultQueryOpts,
  });
}

export function useThreatCampaigns() {
  return useQuery({
    queryKey: ["threat-campaigns"],
    queryFn: () => apiFetch<{ items: { id: string; name: string; actor: string; sectors: string[]; events: { at: string; desc: string }[]; severity: string }[] }>("/v1/threat-intel/campaigns"),
    ...defaultQueryOpts,
  });
}

export function useHuntQueries() {
  return useQuery({
    queryKey: ["hunt", "queries"],
    queryFn: () => apiFetch<{ items: { id: string; name: string; description: string; query: string; frequency: string; lastRun: string; hits: number; severity: string }[] }>("/v1/hunt/queries"),
    ...defaultQueryOpts,
  });
}

export function useHuntAnomalies() {
  return useQuery({
    queryKey: ["hunt", "anomalies"],
    queryFn: () => apiFetch<{ items: { id: string; type: string; description: string; baseline: number; observed: number; deviation: number; assets: string[]; severity: string; confidence: number }[] }>("/v1/hunt/anomalies"),
    ...defaultQueryOpts,
  });
}

export function useHuntResults(query?: string) {
  return useQuery({
    queryKey: ["hunt", "results", query],
    queryFn: () => apiFetch<{ items: { time: string; src: string; dst: string; bytes: string; proto: string }[] }>(`/v1/hunt/results?query=${encodeURIComponent(query ?? "")}`),
    enabled: Boolean(query),
    ...defaultQueryOpts,
  });
}

export function useForensics(endpointId?: string) {
  return useQuery({
    queryKey: ["forensics", endpointId],
    queryFn: () => apiFetch<{
      fileEvents: { time: string; action: string; path: string; hash: string; size: string; severity: string }[];
      processTree: { pid: number; name: string; ppid: number; cmdline: string; user: string; start: string; severity: string }[];
      binaries: { name: string; hash: string; type: string; detection: string; score: number; severity: string }[];
      artifacts: { type: string; detail: string; pid: number }[];
    }>(`/v1/forensics/${endpointId}`),
    enabled: Boolean(endpointId),
    ...defaultQueryOpts,
  });
}

export function useCloudSummary() {
  return useQuery({
    queryKey: ["cloud", "summary"],
    queryFn: () => apiFetch<CloudSummaryApi>("/v1/cloud/summary"),
    ...defaultQueryOpts,
  });
}

export function useNetworkFlows() {
  return useQuery({
    queryKey: ["network", "flows"],
    queryFn: () => apiFetch<{ items: NetworkFlowApi[] }>("/v1/network/flows"),
    ...defaultQueryOpts,
  });
}

export function useDnsQueries() {
  return useQuery({
    queryKey: ["network", "dns"],
    queryFn: () => apiFetch<{ items: DnsQueryApi[] }>("/v1/network/dns"),
    ...defaultQueryOpts,
  });
}

export function useKnowledge(search?: string) {
  return useQuery({
    queryKey: ["knowledge", search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{ items: KnowledgeArticleApi[] }>(`/v1/knowledge${qs}`);
    },
    ...defaultQueryOpts,
  });
}

export function useKnowledgeArticle(id: string) {
  return useQuery({
    queryKey: ["knowledge", id],
    queryFn: () => apiFetch<KnowledgeArticleDetailApi>(`/v1/knowledge/${id}`),
    enabled: !!id,
    ...defaultQueryOpts,
  });
}

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: () => apiFetch<{ items: CaseApi[] }>("/v1/cases"),
    ...defaultQueryOpts,
  });
}

export function useInvestigations() {
  return useQuery({
    queryKey: ["investigations"],
    queryFn: () => apiFetch<{ items: InvestigationApi[] }>("/v1/investigations"),
    ...defaultQueryOpts,
  });
}

export function useCompliance() {
  return useQuery({
    queryKey: ["compliance"],
    queryFn: () => apiFetch<{ items: ComplianceAssessmentApi[] }>("/v1/compliance/assessments"),
    ...defaultQueryOpts,
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch<{ items: ReportApi[] }>("/v1/reports"),
    ...defaultQueryOpts,
  });
}

export function useRunbooks() {
  return useQuery({
    queryKey: ["runbooks"],
    queryFn: () => apiFetch<{ items: RunbookApi[] }>("/v1/runbooks"),
    ...defaultQueryOpts,
  });
}

export function useAttackGraphs() {
  return useQuery({
    queryKey: ["attack-graphs"],
    queryFn: () => apiFetch<{ items: AttackGraphApi[] }>("/v1/attack-graphs"),
    ...defaultQueryOpts,
  });
}

export function useAuditLog(search?: string) {
  return useQuery({
    queryKey: ["audit", search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{ items: AuditLogApi[] }>(`/v1/audit${qs}`);
    },
    ...defaultQueryOpts,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform-health"],
    queryFn: () => apiFetch<PlatformHealthApi>("/v1/health/platform"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: () => apiFetch<{ items: IntegrationApi[] }>("/v1/integrations"),
    ...defaultQueryOpts,
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch<{ items: ApiKeyApi[] }>("/v1/developer/api-keys"),
    ...defaultQueryOpts,
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch<{ items: WebhookApi[] }>("/v1/developer/webhooks"),
    ...defaultQueryOpts,
  });
}

export function useApiNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<{
        items: {
          id: string;
          type: string;
          severity: string;
          title: string;
          body: string | null;
          isRead: boolean;
          createdAt: string;
        }[];
      }>("/v1/notifications"),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useCurrentOrg() {
  return useQuery({
    queryKey: ["org", "current"],
    queryFn: () => apiFetch<{ id: string; name: string; slug: string }>("/v1/orgs/current"),
    staleTime: 60_000,
  });
}

export function useIdentityAnomalies() {
  return useQuery({
    queryKey: ["identity-anomalies"],
    queryFn: () => apiFetch<{ items: IdentityAnomalyApi[] }>("/v1/users/identity-anomalies"),
    ...defaultQueryOpts,
  });
}

// ── Cloud Security Hooks ──
export function useCloudResources(filters?: { cloud?: string; severity?: string }) {
  const qs = filters ? new URLSearchParams(filters as Record<string, string>).toString() : "";
  return useQuery({
    queryKey: ["cloud", "resources", filters],
    queryFn: () => apiFetch<{ items: CloudResourceApi[] }>(`/v1/cloud/resources${qs ? "?" + qs : ""}`),
    ...defaultQueryOpts,
  });
}

export function useCloudAccounts() {
  return useQuery({
    queryKey: ["cloud", "accounts"],
    queryFn: () => apiFetch<{ items: CloudAccountApi[] }>("/v1/cloud/accounts"),
    ...defaultQueryOpts,
  });
}

export function useCloudIamFindings() {
  return useQuery({
    queryKey: ["cloud", "iam-findings"],
    queryFn: () => apiFetch<{ items: CloudIamFindingApi[] }>("/v1/cloud/iam-findings"),
    ...defaultQueryOpts,
  });
}

export function useCloudStorageBuckets() {
  return useQuery({
    queryKey: ["cloud", "storage"],
    queryFn: () => apiFetch<{ items: CloudStorageBucketApi[] }>("/v1/cloud/storage"),
    ...defaultQueryOpts,
  });
}

export function useCloudCompliance() {
  return useQuery({
    queryKey: ["cloud", "compliance"],
    queryFn: () => apiFetch<{ items: CloudComplianceFrameworkApi[] }>("/v1/cloud/compliance"),
    ...defaultQueryOpts,
  });
}

// ── Incident Advanced Features Hooks ──
export function useIncidentSLA(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "sla"],
    queryFn: () => apiFetch<IncidentSLAApi>(`/v1/incidents/${incidentId}/sla`),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useIncidentResponders(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "responders"],
    queryFn: () => apiFetch<{ items: IncidentResponderApi[] }>(`/v1/incidents/${incidentId}/responders`),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useIncidentEscalations(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "escalations"],
    queryFn: () => apiFetch<{ items: IncidentEscalationApi[] }>(`/v1/incidents/${incidentId}/escalations`),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useIncidentRemediations(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId, "remediations"],
    queryFn: () => apiFetch<{ items: IncidentRemediationApi[] }>(`/v1/incidents/${incidentId}/remediations`),
    enabled: !!incidentId,
    ...defaultQueryOpts,
  });
}

export function useAddIncidentResponder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, responder }: { incidentId: string; responder: { userId: string; role: string } }) =>
      apiFetch<IncidentResponderApi>(`/v1/incidents/${incidentId}/responders`, {
        method: "POST",
        body: JSON.stringify(responder),
      }),
    onSuccess: (_, { incidentId }) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId, "responders"] });
    },
  });
}

// ── AI/ML Scoring Hooks ──
export function useThreatScoring() {
  return useQuery({
    queryKey: ["ai", "threat-scoring"],
    queryFn: () => apiFetch<{ items: ThreatScoringResultApi[] }>("/v1/ai/threat-scoring"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAnomalyDetection(filter?: { type?: string; severity?: string }) {
  const qs = filter ? new URLSearchParams(filter as Record<string, string>).toString() : "";
  return useQuery({
    queryKey: ["ai", "anomalies", filter],
    queryFn: () => apiFetch<{ items: AnomalyDetectionResultApi[] }>(`/v1/ai/anomalies${qs ? "?" + qs : ""}`),
    staleTime: 20_000,
    retry: 1,
  });
}

export function useAiRecommendations(incidentId?: string) {
  return useQuery({
    queryKey: ["ai", "recommendations", incidentId],
    queryFn: () => apiFetch<{ items: AiRecommendationApi[] }>(`/v1/ai/recommendations${incidentId ? `?incidentId=${incidentId}` : ""}`),
    enabled: !incidentId || !!incidentId,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useThreatHuntingAssistant(query: string) {
  return useQuery({
    queryKey: ["ai", "hunt-assist", query],
    queryFn: () => apiFetch<{ suggestions: string[]; optimizedQuery: string }>(`/v1/ai/hunt-assist?query=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    staleTime: 15_000,
  });
}

// API response types
export interface EndpointApi {
  id: string;
  hostname: string;
  os: string;
  osType: string;
  riskScore: number;
  status: string;
  isolated: boolean;
  ip: string | null;
  agentVersion: string;
  lastCheckIn: string;
}

export interface VulnerabilityApi {
  id: string;
  cve: string;
  cvss: number;
  epss: number;
  severity: string;
  patchStatus: string;
  exploitStatus: string;
  assetCount: number;
  description: string;
}

export interface ThreatActorApi {
  id: string;
  name: string;
  origin: string;
  motivation: string[];
  ttps: string[];
  aliases: string[];
  severity: string;
  lastSeen: string;
}

export interface IocApi {
  id: string;
  type: string;
  value: string;
  severity: string;
  confidence: number;
}

export interface CloudSummaryAccountApi {
  id: string;
  provider: string;
  accountId: string;
  alias: string;
  syncStatus: string;
  lastSyncAt: string | null;
  totalAssets: number;
  riskScore: number;
  regions: string[];
  findings: {
    id: string;
    type: string;
    principal: string;
    risk: string;
    description: string;
  }[];
  assets: {
    id: string;
    type: string;
    name: string;
    region: string;
    isPublic: boolean;
    riskScore: number;
  }[];
}

export interface CloudSummaryApi {
  accountCount: number;
  totalAssets: number;
  avgRisk: number;
  openFindings: number;
  accounts: CloudSummaryAccountApi[];
}

export interface NetworkFlowApi {
  id: string;
  sourceIp: string;
  destinationIp: string;
  protocol: string | null;
  isMalicious: boolean;
  flowStart: string;
}

export interface DnsQueryApi {
  id: string;
  domain: string;
  isDga: boolean;
  isBlocklisted: boolean;
  queriedAt: string;
}

export interface KnowledgeArticleApi {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeArticleDetailApi extends KnowledgeArticleApi {
  content: string;
}

export interface CaseApi {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
}

export interface InvestigationApi {
  id: string;
  title: string;
  content: string | null;
  updatedAt: string;
}

export interface ComplianceAssessmentApi {
  id: string;
  framework: string;
  name: string;
  scorePercent: number;
  status: string;
  controls: { id: string; controlId: string; title: string; status: string }[];
}

export interface ReportApi {
  id: string;
  title: string;
  reportType: string;
  status: string;
  generatedAt: string | null;
}

export interface RunbookApi {
  id: string;
  name: string;
  description: string | null;
  isAutomated: boolean;
  steps: { name: string; actionType: string }[];
}

export interface AttackGraphApi {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
}

export interface AuditLogApi {
  id: string;
  actor: string;
  action: string;
  resourceType: string | null;
  timestamp: string;
}

export interface PlatformHealthApi {
  overall: string;
  services: { name: string; status: string; latencyMs: number | null }[];
  uptime: string;
}

export interface IntegrationApi {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  eventsIngested: number;
}

export interface ApiKeyApi {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: unknown;
  isActive: boolean;
}

export interface WebhookApi {
  id: string;
  name: string;
  endpointUrl: string;
  isActive: boolean;
}

export interface IdentityAnomalyApi {
  id: string;
  userEmail: string;
  type: string;
  severity: string;
  description: string | null;
}

// Cloud Security Types
export interface CloudResourceApi {
  id: string;
  name: string;
  type: string;
  cloud: string;
  account: string;
  region: string;
  exposure: "public" | "internal" | "private";
  severity: string;
  finding: string;
  age: string;
  ageMs: number;
}

export interface CloudAccountApi {
  id: string;
  name: string;
  provider: string;
  resources: number;
  riskScore: number;
  criticalFindings: number;
  highFindings: number;
  compliance: { framework: string; score: number }[];
  regions: string[];
}

export interface CloudIamFindingApi {
  id: string;
  type: "overprivileged" | "wildcard" | "unused_credential" | "cross_account";
  principal: string;
  account: string;
  detail: string;
  severity: string;
  age: string;
}

export interface CloudStorageBucketApi {
  id: string;
  name: string;
  cloud: string;
  account: string;
  publicAccess: boolean;
  encrypted: boolean;
  piiDetected: boolean;
  severity: string;
  region: string;
}

export interface CloudComplianceFrameworkApi {
  id: string;
  framework: string;
  score: number;
  status: string;
  lastAssessment: string;
  findings: { id: string; controlId: string; title: string; status: string }[];
}

// Incident Advanced Features Types
export interface IncidentSLAApi {
  id: string;
  targetMinutes: number;
  startedAt: string;
  escalationAt: number;
  breached: boolean;
  remainingMinutes: number;
  percentUsed: number;
}

export interface IncidentResponderApi {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: "lead" | "support" | "reviewer";
  joinedAt: string;
}

export interface IncidentEscalationApi {
  id: string;
  from: string;
  to: string;
  reason: string;
  at: string;
  by: string;
}

export interface IncidentRemediationApi {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "complete" | "failed";
  owner: string;
  dueAt: string;
  completedAt: string | null;
  severity: string;
}

// AI/ML Types
export interface ThreatScoringResultApi {
  id: string;
  entityType: string;
  entityName: string;
  threatScore: number;
  severity: string;
  riskFactors: string[];
  confidence: number;
  lastUpdated: string;
}

export interface AnomalyDetectionResultApi {
  id: string;
  type: string;
  description: string;
  severity: string;
  confidence: number;
  baseline: number;
  observed: number;
  deviation: number;
  assets: string[];
  detectedAt: string;
}

export interface AiRecommendationApi {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action: string;
  estimatedImpact: string;
  confidenceScore: number;
}

