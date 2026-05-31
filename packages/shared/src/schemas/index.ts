import { z } from "zod";
import {
  AlertStatusSchema,
  CopilotWorkflowSchema,
  EventTypeSchema,
  IncidentStatusSchema,
  RoleSchema,
  SeverityLevelSchema,
} from "../enums/index.js";

export const PaginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  organizationId: z.string().uuid(),
  workspace: z.string(),
  avatarSeed: z.string().optional(),
  permissions: z.array(z.string()),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SecurityEventListQuerySchema = z.object({
  severity: z.array(SeverityLevelSchema).optional(),
  type: z.array(EventTypeSchema).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  since: z.string().datetime().optional(),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type SecurityEventListQuery = z.infer<typeof SecurityEventListQuerySchema>;

export const SecurityEventDtoSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  type: EventTypeSchema,
  severity: SeverityLevelSchema,
  source: z.string(),
  sourceIp: z.string().nullable(),
  destIp: z.string().nullable(),
  user: z.string().nullable(),
  host: z.string().nullable(),
  rule: z.string().nullable(),
  message: z.string(),
  country: z.string().nullable(),
  asset: z.string().nullable(),
  mitre: z.string().nullable(),
  raw: z.record(z.unknown()).optional(),
});
export type SecurityEventDto = z.infer<typeof SecurityEventDtoSchema>;

export const IncidentListQuerySchema = z.object({
  status: z.array(IncidentStatusSchema).optional(),
  severity: z.array(SeverityLevelSchema).optional(),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;

export const IncidentResponderSchema = z.object({
  name: z.string(),
  role: z.enum(["lead", "support", "reviewer"]),
  joinedAt: z.string(),
});
export type IncidentResponder = z.infer<typeof IncidentResponderSchema>;

export const IncidentSlaSchema = z.object({
  targetMinutes: z.number().int(),
  startedAt: z.string(),
  escalationAt: z.number().int(),
});
export type IncidentSla = z.infer<typeof IncidentSlaSchema>;

export const IncidentEscalationSchema = z.object({
  from: SeverityLevelSchema,
  to: SeverityLevelSchema,
  reason: z.string(),
  at: z.string(),
  by: z.string(),
});
export type IncidentEscalation = z.infer<typeof IncidentEscalationSchema>;

export const IncidentRemediationSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignee: z.string(),
  status: z.enum(["pending", "in_progress", "complete"]),
  dueDate: z.string(),
});
export type IncidentRemediation = z.infer<typeof IncidentRemediationSchema>;

export const IncidentDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  severity: SeverityLevelSchema,
  status: IncidentStatusSchema,
  assignee: z.string().nullable(),
  openedAt: z.string(),
  updatedAt: z.string(),
  affectedAssets: z.number(),
  affectedUsers: z.number(),
  category: z.string().nullable(),
  mitre: z.array(z.string()),
  summary: z.string().nullable(),
  rca: z.string().nullable(),
  recommendations: z.array(z.string()),
  linkedEventIds: z.array(z.string()),
  sla: IncidentSlaSchema.optional(),
  responders: z.array(IncidentResponderSchema).optional(),
  escalations: z.array(IncidentEscalationSchema).optional(),
  remediations: z.array(IncidentRemediationSchema).optional(),
  timeline: z.array(z.object({
    at: z.string(),
    actor: z.string(),
    action: z.string(),
    detail: z.string().optional(),
  })),
});
export type IncidentDto = z.infer<typeof IncidentDtoSchema>;

export const UpdateIncidentStatusSchema = z.object({
  status: IncidentStatusSchema,
});
export type UpdateIncidentStatus = z.infer<typeof UpdateIncidentStatusSchema>;

export const AlertListQuerySchema = z.object({
  severity: z.array(SeverityLevelSchema).optional(),
  status: z.array(AlertStatusSchema).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AlertListQuery = z.infer<typeof AlertListQuerySchema>;

export const AlertDtoSchema = z.object({
  id: z.string().uuid(),
  rule: z.string(),
  severity: SeverityLevelSchema,
  source: z.string(),
  owner: z.string().nullable(),
  aiPriorityScore: z.number(),
  dedupCount: z.number(),
  escalated: z.boolean(),
  acknowledged: z.boolean(),
  suppressed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string().nullable(),
  raw: z.record(z.unknown()).optional(),
});
export type AlertDto = z.infer<typeof AlertDtoSchema>;

export const CopilotSessionCreateSchema = z.object({
  workflowType: CopilotWorkflowSchema.optional(),
  incidentId: z.string().uuid().optional(),
  title: z.string().optional(),
});
export type CopilotSessionCreate = z.infer<typeof CopilotSessionCreateSchema>;

export const CopilotMessageCreateSchema = z.object({
  content: z.string().min(1).max(8000),
  workflowType: CopilotWorkflowSchema.optional(),
});
export type CopilotMessageCreate = z.infer<typeof CopilotMessageCreateSchema>;

export const DashboardStatsSchema = z.object({
  activeThreatCount: z.number(),
  threatScore: z.number(),
  endpointHealthPct: z.number(),
  openVulns: z.number(),
  activeIncidents: z.number(),
  blockedAttacks24h: z.number(),
  cloudRiskScore: z.number(),
  identityRiskScore: z.number(),
  threatTrend: z.array(z.object({
    h: z.string(),
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
  })),
  detectionsByType: z.array(z.object({
    type: z.string(),
    count: z.number(),
  })),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const ExecutiveSummarySchema = z.object({
  riskPosture: z.number(),
  openIncidents: z.number(),
  slaCompliancePct: z.number(),
  meanTimeToDetectMs: z.number(),
  riskBySeverity: z.array(z.object({ label: z.string(), value: z.number(), max: z.number() })),
  compliance: z.array(z.object({ framework: z.string(), score: z.number(), trend: z.string() })),
  financial: z.array(z.object({ metric: z.string(), value: z.string(), trend: z.string() })),
  sla: z.array(z.object({
    metric: z.string(),
    target: z.string(),
    actual: z.string(),
    met: z.boolean(),
  })),
  attackTrends: z.array(z.object({
    type: z.string(),
    count: z.number(),
    change: z.string(),
    severity: z.string(),
  })),
});
export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  query: z.string(),
  severity: z.string(),
  dataSources: z.array(z.string()),
  isEnabled: z.boolean(),
  matches24h: z.number(),
  lastMatchAt: z.string().nullable(),
  status: z.enum(["active", "testing", "disabled"]),
  logSource: z.string().optional(),
  code: z.string().optional(),
});
export type AlertRuleDto = z.infer<typeof AlertRuleSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().uuid().nullable(),
    total: z.number().optional(),
  });
