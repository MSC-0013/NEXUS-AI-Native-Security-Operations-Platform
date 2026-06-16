import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchBlob } from "./api-client";
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

function buildParams(
  params: Record<string, string | number | undefined>,
  arrays?: Record<string, readonly string[] | undefined>,
) {
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

export function useCreateInvestigationFromEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; title: string; updatedAt?: string }>(`/v1/events/${id}/investigation`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

export function useSuppressSimilarEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch<{ ruleId: string; suppressedCount: number; reason: string }>(`/v1/events/${id}/suppress-similar`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["suppression-rules"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useCreateIncidentFromEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; code: string; title: string; severity: string; status: string; openedAt?: string }>(`/v1/events/${id}/incident`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useSuppressSimilarAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch<{ suppressedCount: number; reason: string }>(`/v1/alerts/${id}/suppress-similar`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useCreateIncidentFromAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title?: string }) =>
      apiFetch<{ id: string; code: string; title: string; severity: string; status: string }>(`/v1/alerts/${id}/incident`, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export interface SuppressionRuleApi {
  id: string;
  name: string;
  condition: string;
  createdBy: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useSuppressionRules() {
  return useQuery({
    queryKey: ["suppression-rules"],
    queryFn: () => apiFetch<{ items: SuppressionRuleApi[] }>("/v1/alerts/suppression-rules"),
    ...defaultQueryOpts,
  });
}

export function useCreateSuppressionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; condition: string; expiresAt?: string }) =>
      apiFetch<SuppressionRuleApi>("/v1/alerts/suppression-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppression-rules"] }),
  });
}

export function useUpdateSuppressionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; condition?: string; isActive?: boolean; expiresAt?: string | null }) =>
      apiFetch<SuppressionRuleApi>(`/v1/alerts/suppression-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppression-rules"] }),
  });
}

export function useDeleteSuppressionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/alerts/suppression-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppression-rules"] }),
  });
}

export interface NotificationChannelApi {
  id: string;
  name: string;
  type: string;
  target: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useNotificationChannels() {
  return useQuery({
    queryKey: ["notification-channels"],
    queryFn: () => apiFetch<{ items: NotificationChannelApi[] }>("/v1/alerts/notification-channels"),
    ...defaultQueryOpts,
  });
}

export function useCreateNotificationChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; target: string; config?: Record<string, unknown> }) =>
      apiFetch<NotificationChannelApi>("/v1/alerts/notification-channels", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-channels"] }),
  });
}

export function useUpdateNotificationChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; type?: string; target?: string; config?: Record<string, unknown>; isActive?: boolean }) =>
      apiFetch<NotificationChannelApi>(`/v1/alerts/notification-channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-channels"] }),
  });
}

export function useDeleteNotificationChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/alerts/notification-channels/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-channels"] }),
  });
}

export interface RoutingRuleApi {
  id: string;
  name: string;
  conditions: Record<string, unknown>;
  channelId: string | null;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routing-rules"],
    queryFn: () => apiFetch<{ items: RoutingRuleApi[] }>("/v1/alerts/routing-rules"),
    ...defaultQueryOpts,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; conditions?: Record<string, unknown>; channelId?: string | null; priority?: number }) =>
      apiFetch<RoutingRuleApi>("/v1/alerts/routing-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; conditions?: Record<string, unknown>; channelId?: string | null; priority?: number; isActive?: boolean }) =>
      apiFetch<RoutingRuleApi>(`/v1/alerts/routing-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/alerts/routing-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routing-rules"] }),
  });
}

export interface EscalationStepApi {
  order: number;
  delayMinutes: number;
  channelId?: string | null;
  notifyRole?: string;
}

export interface EscalationPolicyApi {
  id: string;
  name: string;
  description: string | null;
  steps: EscalationStepApi[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useEscalationPolicies() {
  return useQuery({
    queryKey: ["escalation-policies"],
    queryFn: () => apiFetch<{ items: EscalationPolicyApi[] }>("/v1/alerts/escalation-policies"),
    ...defaultQueryOpts,
  });
}

export function useCreateEscalationPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; steps?: EscalationStepApi[] }) =>
      apiFetch<EscalationPolicyApi>("/v1/alerts/escalation-policies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalation-policies"] }),
  });
}

export function useUpdateEscalationPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; steps?: EscalationStepApi[]; isActive?: boolean }) =>
      apiFetch<EscalationPolicyApi>(`/v1/alerts/escalation-policies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalation-policies"] }),
  });
}

export function useDeleteEscalationPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/alerts/escalation-policies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalation-policies"] }),
  });
}

export interface PolicyApi {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  isEnabled: boolean;
  violationCount: number;
  lastTriggeredAt: string | null;
  createdAt?: string;
}

export function usePolicies(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return useQuery({
    queryKey: ["policies", category],
    queryFn: () => apiFetch<{ items: PolicyApi[] }>(`/v1/policies${qs}`),
    ...defaultQueryOpts,
  });
}

export function useTogglePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      apiFetch<PolicyApi>(`/v1/policies/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; category: string; severity?: string }) =>
      apiFetch<PolicyApi>("/v1/policies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export interface TestRuleResult {
  ruleId: string;
  ruleName: string;
  query: string;
  testedAt: string;
  matchCount: number;
  sampleEvents: unknown[];
  status: "completed";
  message: string;
}

export function useTestDetectionRule() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<TestRuleResult>(`/v1/detection-rules/${id}/test`, { method: "POST" }),
  });
}

export function useImportDetectionRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rules: Array<{ name: string; description?: string; query: string; severity?: string; dataSources?: string[] }>) =>
      apiFetch<{ imported: number; items: unknown[] }>("/v1/detection-rules/import", {
        method: "POST",
        body: JSON.stringify({ rules }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["detection-rules"] }),
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

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      apiFetch<AlertRuleDto>(`/v1/detection-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["detection-rules"] }),
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      query: string;
      severity: string;
      dataSources?: string[];
      runFrequencyMinutes?: number;
      lookbackMinutes?: number;
      thresholdCount?: number;
    }) =>
      apiFetch<AlertRuleDto>("/v1/detection-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["detection-rules"] }),
  });
}

export function useAddIncidentComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, content }: { incidentId: string; content: string }) =>
      apiFetch<{ id: string; content: string; createdAt?: string }>(`/v1/incidents/${incidentId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, { incidentId }) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId, "comments"] });
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
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

/** Create a report from live data and immediately download it as CSV. */
export function useExportReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, reportType }: { title: string; reportType: string }) => {
      const report = await apiFetch<{ id: string }>("/v1/reports", {
        method: "POST",
        body: JSON.stringify({ title, reportType }),
      });
      const { blob, filename } = await apiFetchBlob(`/v1/reports/${report.id}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return report;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
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

export type OrgUser = {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  lastLoginAt?: string;
  createdAt?: string;
};

export function useOrgUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ items: OrgUser[] }>("/v1/users"),
    ...defaultQueryOpts,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; fullName: string; role?: string }) =>
      apiFetch<OrgUser>("/v1/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; fullName?: string; role?: string; status?: string }) =>
      apiFetch<OrgUser>(`/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/v1/users/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
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

export function useIsolateEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EndpointApi>(`/v1/endpoints/${id}/isolate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      qc.invalidateQueries({ queryKey: ["forensics"] });
    },
  });
}

export function useUnisolateEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EndpointApi>(`/v1/endpoints/${id}/unisolate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      qc.invalidateQueries({ queryKey: ["forensics"] });
    },
  });
}

export interface EndpointScanResult extends EndpointApi {
  scanSummary: {
    indicatorsFound: number;
    activeThreats: number;
    quarantined: number;
    scannedAt: string;
  };
}

export function useScanEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EndpointScanResult>(`/v1/endpoints/${id}/scan`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      qc.invalidateQueries({ queryKey: ["forensics"] });
    },
  });
}

export interface EndpointProcessApi {
  id: string;
  pid: number | null;
  parentPid: number | null;
  name: string;
  path: string | null;
  commandLine: string | null;
  user: string | null;
  hashSha256: string | null;
  isSigned: boolean | null;
  signer: string | null;
  isElevated: boolean;
  isMalicious: boolean;
  startedAt: string | null;
  endedAt: string | null;
}

export function useEndpointProcesses(endpointId?: string) {
  return useQuery({
    queryKey: ["endpoint-processes", endpointId],
    queryFn: () => apiFetch<{ items: EndpointProcessApi[] }>(`/v1/endpoints/${endpointId}/processes`),
    enabled: Boolean(endpointId),
    ...defaultQueryOpts,
  });
}

export interface EndpointConnectionApi {
  id: string;
  direction: string | null;
  protocol: string | null;
  localIp: string | null;
  localPort: number | null;
  remoteIp: string | null;
  remotePort: number | null;
  remoteHost: string | null;
  bytesSent: number;
  bytesRecv: number;
  isMalicious: boolean;
  iocMatched: string | null;
  connectionAt: string | null;
}

export function useEndpointConnections(endpointId?: string) {
  return useQuery({
    queryKey: ["endpoint-connections", endpointId],
    queryFn: () => apiFetch<{ items: EndpointConnectionApi[] }>(`/v1/endpoints/${endpointId}/network`),
    enabled: Boolean(endpointId),
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

export interface VulnerabilityDetailApi extends VulnerabilityApi {
  cvssVector: string | null;
  epssPercentile: number;
  referenceLinks: string[];
  cweIds: string[];
  affectedAssets: {
    id: string;
    assetId: string;
    assetType: string;
    status: string | null;
    riskAccepted: boolean;
    riskAcceptedAt: string | null;
    patchedAt: string | null;
    discoveredAt: string | null;
  }[];
}

export function useVulnerability(id?: string) {
  return useQuery({
    queryKey: ["vulnerability", id],
    queryFn: () => apiFetch<VulnerabilityDetailApi>(`/v1/vulnerabilities/${id}`),
    enabled: Boolean(id),
    ...defaultQueryOpts,
  });
}

export function useCreateVulnException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; assetId?: string; reason?: string }) =>
      apiFetch<{ vulnerabilityId: string; exceptedAssetCount: number; reason: string | null }>(
        `/v1/vulnerabilities/${id}/exception`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["vulnerabilities"] });
      qc.invalidateQueries({ queryKey: ["vulnerability", id] });
    },
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

export function useCreateIoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { iocType: string; value: string; context?: string; confidenceScore?: number; severity?: string; threatActorId?: string; expiresAt?: string }) =>
      apiFetch<IocApi>("/v1/threat-intel/iocs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-iocs"] }),
  });
}

export function useUpdateIoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; context?: string; confidenceScore?: number; severity?: string; isActive?: boolean; expiresAt?: string | null }) =>
      apiFetch<IocApi>(`/v1/threat-intel/iocs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-iocs"] }),
  });
}

export function useDeleteIoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/v1/threat-intel/iocs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-iocs"] }),
  });
}

export function useImportIocs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { iocType: string; value: string; severity?: string; confidenceScore?: number }[]) =>
      apiFetch<{ imported: number }>("/v1/threat-intel/iocs/import", { method: "POST", body: JSON.stringify({ items }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-iocs"] }),
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

export interface HuntQueryApi {
  id: string;
  name: string;
  description: string;
  query: string;
  frequency: string;
  lastRun: string;
  hits: number;
  severity: string;
}

export function useHuntQueries() {
  return useQuery({
    queryKey: ["hunt", "queries"],
    queryFn: () => apiFetch<{ items: HuntQueryApi[] }>("/v1/hunt/queries"),
    ...defaultQueryOpts,
  });
}

export function useCreateHuntQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; query: string; severity?: string; scheduleMinutes?: number }) =>
      apiFetch<HuntQueryApi>("/v1/hunt/queries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hunt", "queries"] }),
  });
}

export function useUpdateHuntQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; query?: string; severity?: string; scheduleMinutes?: number | null; isEnabled?: boolean }) =>
      apiFetch<HuntQueryApi>(`/v1/hunt/queries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hunt", "queries"] }),
  });
}

export function useDeleteHuntQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/v1/hunt/queries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hunt", "queries"] }),
  });
}

export function useRunHuntQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ query: HuntQueryApi; result: { items: { time: string; src: string; dst: string; bytes: string; proto: string }[]; total: number } }>(
        `/v1/hunt/queries/${id}/run`,
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hunt", "queries"] }),
  });
}

export function useHuntAnomalies() {
  return useQuery({
    queryKey: ["hunt", "anomalies"],
    queryFn: () => apiFetch<{ items: { id: string; type: string; description: string; baseline: number; observed: number; deviation: number; assets: string[]; severity: string; confidence: number }[] }>("/v1/hunt/anomalies"),
    ...defaultQueryOpts,
  });
}

export function useHuntResults(query?: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ["hunt", "results", query, limit, offset],
    queryFn: () =>
      apiFetch<{ items: { time: string; src: string; dst: string; bytes: string; proto: string }[]; total: number }>(
        `/v1/hunt/results?query=${encodeURIComponent(query ?? "")}&limit=${limit}&offset=${offset}`,
      ),
    enabled: query !== undefined,
    placeholderData: (prev) => prev,
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

export function useMarkFlowMalicious() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; isMalicious: boolean; threatCategory?: string }) =>
      apiFetch<NetworkFlowApi>(`/v1/network/flows/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["network", "flows"] }),
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

export interface KnowledgeBookmarkApi {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  bookmarkedAt: string;
}

export function useKnowledgeBookmarks() {
  return useQuery({
    queryKey: ["knowledge", "bookmarks"],
    queryFn: () => apiFetch<{ items: KnowledgeBookmarkApi[] }>("/v1/knowledge/bookmarks"),
    ...defaultQueryOpts,
  });
}

export function useBookmarkArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ bookmarked: boolean }>(`/v1/knowledge/${id}/bookmark`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge", "bookmarks"] }),
  });
}

export function useUnbookmarkArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ bookmarked: boolean }>(`/v1/knowledge/${id}/bookmark`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge", "bookmarks"] }),
  });
}

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: () => apiFetch<{ items: CaseApi[] }>("/v1/cases"),
    ...defaultQueryOpts,
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; priority?: string; ownerId?: string; title?: string }) =>
      apiFetch<CaseApi>(`/v1/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; priority?: string; tags?: string[] }) =>
      apiFetch<CaseApi>("/v1/cases", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/v1/cases/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}

export interface CaseEvidenceApi {
  id: string;
  type: string;
  title: string;
  description: string | null;
  fileName: string | null;
  mimeType: string | null;
  storageUri: string | null;
  hashSha256: string | null;
  addedAt: string;
}

export function useCaseEvidence(caseId?: string) {
  return useQuery({
    queryKey: ["case-evidence", caseId],
    queryFn: () => apiFetch<{ items: CaseEvidenceApi[] }>(`/v1/cases/${caseId}/evidence`),
    enabled: Boolean(caseId),
    ...defaultQueryOpts,
  });
}

export function useAddCaseEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, ...body }: { caseId: string; type: string; title: string; description?: string; fileName?: string; mimeType?: string; storageUri?: string; hashSha256?: string }) =>
      apiFetch<CaseEvidenceApi>(`/v1/cases/${caseId}/evidence`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["case-evidence", caseId] });
      qc.invalidateQueries({ queryKey: ["case-activity", caseId] });
    },
  });
}

export function useDeleteCaseEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, evidenceId }: { caseId: string; evidenceId: string }) =>
      apiFetch<void>(`/v1/cases/${caseId}/evidence/${evidenceId}`, { method: "DELETE" }),
    onSuccess: (_d, { caseId }) => qc.invalidateQueries({ queryKey: ["case-evidence", caseId] }),
  });
}

export interface CaseTaskApi {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function useCaseTasks(caseId?: string) {
  return useQuery({
    queryKey: ["case-tasks", caseId],
    queryFn: () => apiFetch<{ items: CaseTaskApi[] }>(`/v1/cases/${caseId}/tasks`),
    enabled: Boolean(caseId),
    ...defaultQueryOpts,
  });
}

export function useCreateCaseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, ...body }: { caseId: string; title: string; description?: string; assigneeId?: string; dueDate?: string }) =>
      apiFetch<CaseTaskApi>(`/v1/cases/${caseId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["case-tasks", caseId] });
      qc.invalidateQueries({ queryKey: ["case-activity", caseId] });
    },
  });
}

export function useUpdateCaseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, taskId, ...body }: { caseId: string; taskId: string; title?: string; description?: string; status?: string; assigneeId?: string; dueDate?: string | null }) =>
      apiFetch<CaseTaskApi>(`/v1/cases/${caseId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_d, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["case-tasks", caseId] });
      qc.invalidateQueries({ queryKey: ["case-activity", caseId] });
    },
  });
}

export function useDeleteCaseTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, taskId }: { caseId: string; taskId: string }) =>
      apiFetch<void>(`/v1/cases/${caseId}/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: (_d, { caseId }) => qc.invalidateQueries({ queryKey: ["case-tasks", caseId] }),
  });
}

export interface CaseActivityApi {
  id: string;
  actorName: string;
  actionType: string;
  description: string;
  createdAt: string;
}

export function useCaseActivity(caseId?: string) {
  return useQuery({
    queryKey: ["case-activity", caseId],
    queryFn: () => apiFetch<{ items: CaseActivityApi[] }>(`/v1/cases/${caseId}/activity`),
    enabled: Boolean(caseId),
    ...defaultQueryOpts,
  });
}

export interface CaseWatcherApi {
  userId: string;
  name: string;
  email: string;
  addedAt: string;
}

export function useCaseWatchers(caseId?: string) {
  return useQuery({
    queryKey: ["case-watchers", caseId],
    queryFn: () => apiFetch<{ items: CaseWatcherApi[] }>(`/v1/cases/${caseId}/watchers`),
    enabled: Boolean(caseId),
    ...defaultQueryOpts,
  });
}

export function useAddCaseWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, userId }: { caseId: string; userId?: string }) =>
      apiFetch<{ watching: boolean }>(`/v1/cases/${caseId}/watchers`, { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: (_d, { caseId }) => qc.invalidateQueries({ queryKey: ["case-watchers", caseId] }),
  });
}

export function useRemoveCaseWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, userId }: { caseId: string; userId: string }) =>
      apiFetch<{ watching: boolean }>(`/v1/cases/${caseId}/watchers/${userId}`, { method: "DELETE" }),
    onSuccess: (_d, { caseId }) => qc.invalidateQueries({ queryKey: ["case-watchers", caseId] }),
  });
}

export function useInvestigations() {
  return useQuery({
    queryKey: ["investigations"],
    queryFn: () => apiFetch<{ items: InvestigationApi[] }>("/v1/investigations"),
    ...defaultQueryOpts,
  });
}

export interface InvestigationEvidenceApi {
  id: string;
  type: string;
  title: string;
  description: string | null;
  fileName: string | null;
  mimeType: string | null;
  storageUri: string | null;
  hashSha256: string | null;
  addedAt: string;
}

export function useInvestigationEvidence(investigationId?: string) {
  return useQuery({
    queryKey: ["investigation-evidence", investigationId],
    queryFn: () => apiFetch<{ items: InvestigationEvidenceApi[] }>(`/v1/investigations/${investigationId}/evidence`),
    enabled: Boolean(investigationId),
    ...defaultQueryOpts,
  });
}

export function useAddInvestigationEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, ...body }: { investigationId: string; type: string; title: string; description?: string; fileName?: string; mimeType?: string; storageUri?: string; hashSha256?: string }) =>
      apiFetch<InvestigationEvidenceApi>(`/v1/investigations/${investigationId}/evidence`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { investigationId }) => qc.invalidateQueries({ queryKey: ["investigation-evidence", investigationId] }),
  });
}

export function useDeleteInvestigationEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, evidenceId }: { investigationId: string; evidenceId: string }) =>
      apiFetch<void>(`/v1/investigations/${investigationId}/evidence/${evidenceId}`, { method: "DELETE" }),
    onSuccess: (_d, { investigationId }) => qc.invalidateQueries({ queryKey: ["investigation-evidence", investigationId] }),
  });
}

export interface InvestigationEntityApi {
  id: string;
  entityType: string;
  entityValue: string;
  notes: string | null;
  addedAt: string;
}

export function useInvestigationEntities(investigationId?: string) {
  return useQuery({
    queryKey: ["investigation-entities", investigationId],
    queryFn: () => apiFetch<{ items: InvestigationEntityApi[] }>(`/v1/investigations/${investigationId}/entities`),
    enabled: Boolean(investigationId),
    ...defaultQueryOpts,
  });
}

export function useAddInvestigationEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, ...body }: { investigationId: string; entityType: string; entityValue: string; notes?: string }) =>
      apiFetch<InvestigationEntityApi>(`/v1/investigations/${investigationId}/entities`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { investigationId }) => qc.invalidateQueries({ queryKey: ["investigation-entities", investigationId] }),
  });
}

export function useDeleteInvestigationEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, entityId }: { investigationId: string; entityId: string }) =>
      apiFetch<void>(`/v1/investigations/${investigationId}/entities/${entityId}`, { method: "DELETE" }),
    onSuccess: (_d, { investigationId }) => qc.invalidateQueries({ queryKey: ["investigation-entities", investigationId] }),
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

export interface ReportScheduleApi {
  id: string;
  reportType: string;
  title: string;
  cronSchedule: string;
  recipients: string[];
  parameters: Record<string, unknown>;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt?: string;
}

export function useReportSchedules() {
  return useQuery({
    queryKey: ["report-schedules"],
    queryFn: () => apiFetch<{ items: ReportScheduleApi[] }>("/v1/reports/schedules"),
    ...defaultQueryOpts,
  });
}

export function useScheduleReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { reportType: string; title: string; cronSchedule: string; recipients: string[]; parameters?: Record<string, unknown> }) =>
      apiFetch<ReportScheduleApi>("/v1/reports/schedule", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-schedules"] }),
  });
}

export function useDeleteReportSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/v1/reports/schedule/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-schedules"] }),
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

export function useCreateKnowledgeArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; category?: string; content: string; tags: string[] }) =>
      apiFetch<KnowledgeArticleDetailApi>("/v1/knowledge", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge"] }),
  });
}

export function useAssignRunbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee, priority }: { id: string; assignee: string; priority: "low" | "medium" | "high" | "critical" }) =>
      apiFetch<{ id: string; runbookId: string; assignee: string; priority: string; status: string }>(`/v1/runbooks/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignee, priority }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runbooks"] }),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; scopes: string[] }) =>
      apiFetch<ApiKeyApi & { key: string }>("/v1/developer/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/developer/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch<{ items: WebhookApi[] }>("/v1/developer/webhooks"),
    ...defaultQueryOpts,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; endpointUrl: string; subscribedEvents: string[] }) =>
      apiFetch<WebhookApi>("/v1/developer/webhooks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/developer/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; endpointUrl?: string; subscribedEvents?: string[]; isActive?: boolean }) =>
      apiFetch<WebhookApi>(`/v1/developer/webhooks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; success: boolean; responseStatus: number | null; responseBody: string; deliveryTimeMs: number }>(
        `/v1/developer/webhooks/${id}/test`,
        { method: "POST" },
      ),
  });
}

export function useWebhookDeliveries(webhookId?: string) {
  return useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: () => apiFetch<{ items: { id: string; eventType: string; responseStatus: number | null; deliveryTimeMs: number | null; retryCount: number; success: boolean; deliveredAt: string }[] }>(
      `/v1/developer/webhooks/${webhookId}/deliveries`,
    ),
    enabled: Boolean(webhookId),
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

export function useConnectCloudAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: "aws" | "azure" | "gcp"; accountId: string; accountAlias?: string; regions?: string[]; credentials?: Record<string, string> }) =>
      apiFetch<CloudAccountApi>("/v1/cloud/accounts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud", "accounts"] });
      qc.invalidateQueries({ queryKey: ["cloud", "summary"] });
    },
  });
}

export function useDeleteCloudAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/v1/cloud/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cloud", "accounts"] });
      qc.invalidateQueries({ queryKey: ["cloud", "summary"] });
    },
  });
}

export function useSyncCloudAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; syncStatus: string; lastSyncAt: string; message: string }>(`/v1/cloud/accounts/${id}/sync`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud", "accounts"] }),
  });
}

export function useResolveIamFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string; isResolved: boolean }>(`/v1/cloud/iam-findings/${id}/resolve`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cloud", "iam-findings"] }),
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

export function useEscalateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, reason, targetSeverity }: { incidentId: string; reason: string; targetSeverity?: string }) =>
      apiFetch(`/v1/incidents/${incidentId}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason, targetSeverity }),
      }),
    onSuccess: (_, { incidentId }) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident", incidentId, "escalations"] });
    },
  });
}

export function useGeneratePostmortem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) =>
      apiFetch<{
        sections: { title: string; content: string }[];
        generatedAt: string;
      }>(`/v1/incidents/${incidentId}/postmortem`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (_, incidentId) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useUpdateIncidentRca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, step, notes }: { incidentId: string; step: string; notes?: string }) =>
      apiFetch(`/v1/incidents/${incidentId}/rca`, {
        method: "PATCH",
        body: JSON.stringify({ step, notes }),
      }),
    onSuccess: (_, { incidentId }) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useUpdateIncidentAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, assigneeId }: { incidentId: string; assigneeId: string }) =>
      apiFetch(`/v1/incidents/${incidentId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId }),
      }),
    onSuccess: (_, { incidentId }) => {
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useOpenIncidentInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) =>
      apiFetch<{ id: string; title: string; incidentId: string | null; created: boolean }>(
        `/v1/incidents/${incidentId}/investigation`,
        { method: "POST" },
      ),
    onSuccess: (_, incidentId) => {
      qc.invalidateQueries({ queryKey: ["investigations"] });
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function usePatchVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patchStatus }: { id: string; patchStatus: string }) =>
      apiFetch(`/v1/vulnerabilities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ patchStatus }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vulnerabilities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useCreateInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; content?: string; caseId?: string; incidentId?: string }) =>
      apiFetch("/v1/investigations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

export function useUpdateInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; content?: string; isPublished?: boolean }) =>
      apiFetch(`/v1/investigations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investigations"] }),
  });
}

export interface InvestigationNoteApi {
  id: string;
  author: string;
  body: string;
  at: string;
}

export function useInvestigationNotes(investigationId: string | undefined) {
  return useQuery({
    queryKey: ["investigation-notes", investigationId],
    queryFn: () => apiFetch<{ items: InvestigationNoteApi[] }>(`/v1/investigations/${investigationId}/notes`),
    enabled: !!investigationId,
    ...defaultQueryOpts,
  });
}

export function useAddInvestigationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ investigationId, body }: { investigationId: string; body: string }) =>
      apiFetch<InvestigationNoteApi>(`/v1/investigations/${investigationId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: (_, { investigationId }) => {
      qc.invalidateQueries({ queryKey: ["investigation-notes", investigationId] });
      qc.invalidateQueries({ queryKey: ["investigations"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useDeleteInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/investigations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investigations"] }),
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
  ownerId: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  services: { name: string; status: string; latencyMs: number | null; checkedAt?: string }[];
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
  createdAt: string;
  lastUsedAt: string | null;
}


export interface WebhookApi {
  id: string;
  url: string;
  endpointUrl?: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
  createdAt: string;
}

export interface IdentityAnomalyApi {
  id: string;
  userId: string;
  userEmail: string;
  anomalyType: string;
  type: string;
  severity: string;
  description?: string;
  riskScore: number;
  detectedAt: string;
  details: Record<string, unknown>;
}

export interface CloudResourceApi {
  id: string;
  resourceId: string;
  resourceType: string;
  cloud: string;
  region: string;
  accountId: string;
  account?: string;
  name?: string;
  finding?: string;
  exposure?: string | null;
  severity: string;
  riskScore: number;
  age?: string;
  tags: Record<string, string>;
  createdAt: string;
}

export interface CloudAccountApi {
  id: string;
  accountId?: string;
  provider: string;
  alias?: string | null;
  name?: string;
  status?: string;
  resources: number;
  regions: string[];
  riskScore: number;
  criticalFindings: number;
  highFindings: number;
  compliance: { framework: string; score: number }[];
  createdAt?: string;
}

export interface CloudIamFindingApi {
  id: string;
  type: string;
  findingType?: string;
  severity: string;
  principal: string;
  resource: string;
  account?: string;
  detail?: string | null;
  details?: string | null;
  age?: string;
  detectedAt: string;
}

export interface CloudStorageBucketApi {
  id: string;
  bucketName: string;
  name?: string;
  cloud?: string;
  provider: string;
  region: string;
  account?: string;
  severity?: string;
  publicAccess: boolean;
  isPublic: boolean;
  encrypted?: boolean;
  isEncrypted: boolean;
  piiDetected?: boolean;
  riskLevel: string;
}

export interface CloudComplianceFrameworkApi {
  id: string;
  framework: string;
  score: number;
  passedControls: number;
  totalControls: number;
  lastAssessedAt: string;
}

export interface IncidentSLAApi {
  incidentId: string;
  slaBreached: boolean;
  responseDeadline: string;
  resolutionDeadline: string;
  responseBreached: boolean;
  minutesRemaining: number;
}

export interface IncidentResponderApi {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  assignedAt: string;
}

export interface IncidentEscalationApi {
  id: string;
  escalatedBy: string;
  reason: string;
  toSeverity: string | null;
  escalatedAt: string;
}

export interface IncidentRemediationApi {
  id: string;
  action: string;
  status: string;
  assignedTo: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AiRecommendationApi {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  incidentId: string | null;
  createdAt: string;
}

export interface ThreatScoringResultApi {
  id: string;
  entityType: string;
  entityId: string;
  score: number;
  factors: string[];
  scoredAt: string;
}

export interface AnomalyDetectionResultApi {
  id: string;
  type: string;
  severity: string;
  entityId: string;
  description: string;
  detectedAt: string;
  score: number;
}

export interface InvestigationApi {
  id: string;
  title: string;
  content: string | null;
  caseId: string | null;
  incidentId: string | null;
  isPublished: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface ComplianceAssessmentApi {
  id: string;
  framework: string;
  score: number;
  status: string;
  createdAt: string;
}

export interface ReportApi {
  id: string;
  reportType: string;
  title: string;
  status: string;
  storageUri: string | null;
  generatedAt: string | null;
  createdAt: string;
}

export interface RunbookApi {
  id: string;
  name: string;
  description: string | null;
  steps: { name: string; actionType: string }[];
  createdAt: string;
}

export interface AttackGraphApi {
  id: string;
  nodes: unknown[];
  edges: unknown[];
  generatedAt: string;
}

export interface AuditLogApi {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface PlatformHealthApi {
  service: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastChecked: string;
}
