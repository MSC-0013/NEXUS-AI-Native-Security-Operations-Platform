import {
  pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, numeric, bigint, primaryKey,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industry: varchar("industry", { length: 100 }),
  logoUrl: text("logo_url"),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }),
  maxUsers: integer("max_users").default(100),
  dataRetentionDays: integer("data_retention_days").default(90),
  mfaRequired: boolean("mfa_required").default(false),
  ssoEnabled: boolean("sso_enabled").default(false),
  ssoProvider: varchar("sso_provider", { length: 50 }),
  ssoMetadataUrl: text("sso_metadata_url"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  roleId: uuid("role_id").references(() => roles.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  avatarUrl: text("avatar_url"),
  avatarSeed: varchar("avatar_seed", { length: 255 }),
  department: varchar("department", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  workspaceName: varchar("workspace_name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  mfaBackupCodes: jsonb("mfa_backup_codes"),
  mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
  ssoProvider: varchar("sso_provider", { length: 50 }),
  ssoId: varchar("sso_id", { length: 255 }),
  riskScore: integer("risk_score").default(0),
  failedLoginCount: integer("failed_login_count").default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  refreshToken: varchar("refresh_token", { length: 512 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  isRevoked: boolean("is_revoked").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow(),
  type: varchar("type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  sourceIp: varchar("source_ip", { length: 45 }),
  destIp: varchar("dest_ip", { length: 45 }),
  sourcePort: integer("source_port"),
  destPort: integer("dest_port"),
  protocol: varchar("protocol", { length: 20 }),
  username: varchar("username", { length: 255 }),
  host: varchar("host", { length: 255 }),
  endpointId: uuid("endpoint_id"),
  ruleId: varchar("rule_id", { length: 100 }),
  ruleName: varchar("rule_name", { length: 255 }),
  message: text("message").notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  asset: varchar("asset", { length: 255 }),
  mitreTactic: varchar("mitre_tactic", { length: 100 }),
  mitreTechnique: varchar("mitre_technique", { length: 100 }),
  rawData: jsonb("raw_data").default({}),
});

export const alertRules = pgTable("alert_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  query: text("query").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  mitreTactics: jsonb("mitre_tactics").default([]),
  mitreTechniques: jsonb("mitre_techniques").default([]),
  dataSources: jsonb("data_sources").default([]),
  runFrequencyMinutes: integer("run_frequency_minutes").default(5),
  lookbackMinutes: integer("lookback_minutes").default(60),
  thresholdCount: integer("threshold_count").default(1),
  dedupWindowMinutes: integer("dedup_window_minutes").default(60),
  suppressionEnabled: boolean("suppression_enabled").default(false),
  suppressionReason: text("suppression_reason"),
  isEnabled: boolean("is_enabled").default(true),
  falsePositiveCount: integer("false_positive_count").default(0),
  truePositiveCount: integer("true_positive_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  ruleId: uuid("rule_id"),
  ownerId: uuid("owner_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("new"),
  aiPriorityScore: integer("ai_priority_score").default(0),
  dedupCount: integer("dedup_count").default(1),
  dedupKey: varchar("dedup_key", { length: 255 }),
  isEscalated: boolean("is_escalated").default(false),
  isAcknowledged: boolean("is_acknowledged").default(false),
  isSuppressed: boolean("is_suppressed").default(false),
  suppressionReason: text("suppression_reason"),
  endpointId: uuid("endpoint_id"),
  sourceIp: varchar("source_ip", { length: 45 }),
  mitreTechnique: varchar("mitre_technique", { length: 100 }),
  rawTriggerData: jsonb("raw_trigger_data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  incidentCode: varchar("incident_code", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("open"),
  leadInvestigatorId: uuid("lead_investigator_id"),
  category: varchar("category", { length: 100 }),
  affectedAssetsCount: integer("affected_assets_count").default(0),
  affectedUsersCount: integer("affected_users_count").default(0),
  summary: text("summary"),
  rootCauseAnalysis: text("root_cause_analysis"),
  remediationSteps: text("remediation_steps"),
  postmortemUrl: text("postmortem_url"),
  slaHours: integer("sla_hours").default(24),
  slaBreachAt: timestamp("sla_breach_at", { withTimezone: true }),
  slaBreached: boolean("sla_breached").default(false),
  escalated: boolean("escalated").default(false),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  containedAt: timestamp("contained_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const incidentTimeline = pgTable("incident_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  actorType: varchar("actor_type", { length: 20 }).default("user"),
  actorId: uuid("actor_id"),
  actorName: varchar("actor_name", { length: 255 }),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
});

export const incidentComments = pgTable("incident_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  authorId: uuid("author_id"),
  content: text("content").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false),
  parentCommentId: uuid("parent_comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const incidentEvidence = pgTable("incident_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  addedBy: uuid("added_by"),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileName: varchar("file_name", { length: 255 }),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  storageUri: text("storage_uri"),
  hashSha256: varchar("hash_sha256", { length: 64 }),
  isSensitive: boolean("is_sensitive").default(false),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const incidentRecommendations = pgTable("incident_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  content: text("content").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedBy: uuid("completed_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  orderIndex: integer("order_index").default(0),
});

export const incidentMitreTechniques = pgTable("incident_mitre_techniques", {
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  mitreId: varchar("mitre_id", { length: 20 }).notNull(),
  mitreName: varchar("mitre_name", { length: 255 }),
  mitreTactic: varchar("mitre_tactic", { length: 100 }),
}, (t) => ({ pk: primaryKey({ columns: [t.incidentId, t.mitreId] }) }));

export const incidentAlerts = pgTable("incident_alerts", {
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  alertId: uuid("alert_id").notNull().references(() => alerts.id),
  linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow(),
  linkedBy: uuid("linked_by"),
}, (t) => ({ pk: primaryKey({ columns: [t.incidentId, t.alertId] }) }));

export const incidentResponders = pgTable("incident_responders", {
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 100 }).default("responder"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.incidentId, t.userId] }) }));

export const copilotSessions = pgTable("copilot_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }),
  workflowType: varchar("workflow_type", { length: 50 }),
  incidentId: uuid("incident_id"),
  alertId: uuid("alert_id"),
  context: jsonb("context").default({}),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const copilotMessages = pgTable("copilot_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => copilotSessions.id),
  senderRole: varchar("sender_role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  modelUsed: varchar("model_used", { length: 100 }),
  promptTokens: integer("prompt_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  latencyMs: integer("latency_ms"),
  suggestions: jsonb("suggestions").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  authorId: uuid("author_id"),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: jsonb("tags").default([]),
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  type: varchar("type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("info"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  actionUrl: text("action_url"),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: uuid("resource_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id"),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: uuid("resource_id"),
  resourceLabel: varchar("resource_label", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

export const endpoints = pgTable("endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  os: varchar("os", { length: 20 }).notNull(),
  osVersion: varchar("os_version", { length: 100 }),
  osBuild: varchar("os_build", { length: 50 }),
  kernelVersion: varchar("kernel_version", { length: 100 }),
  architecture: varchar("architecture", { length: 20 }).default("x86_64"),
  agentId: varchar("agent_id", { length: 255 }),
  agentVersion: varchar("agent_version", { length: 50 }),
  agentStatus: varchar("agent_status", { length: 50 }).default("active"),
  status: varchar("status", { length: 50 }).default("healthy"),
  ipAddress: varchar("ip_address", { length: 45 }),
  externalIp: varchar("external_ip", { length: 45 }),
  macAddress: varchar("mac_address", { length: 50 }),
  isIsolated: boolean("is_isolated").default(false),
  isolatedAt: timestamp("isolated_at", { withTimezone: true }),
  isolatedBy: uuid("isolated_by"),
  riskOverall: integer("risk_overall").default(0),
  riskMalware: integer("risk_malware").default(0),
  riskNetwork: integer("risk_network").default(0),
  riskCredential: integer("risk_credential").default(0),
  riskBehavior: integer("risk_behavior").default(0),
  sessionCount: integer("session_count").default(0),
  tags: jsonb("tags").default([]),
  labels: jsonb("labels").default({}),
  ownerUserId: uuid("owner_user_id"),
  department: varchar("department", { length: 100 }),
  location: varchar("location", { length: 255 }),
  lastCheckIn: timestamp("last_check_in", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const endpointMalwareIndicators = pgTable("endpoint_malware_indicators", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").notNull().references(() => endpoints.id),
  indicatorType: varchar("indicator_type", { length: 50 }).notNull(),
  indicator: text("indicator").notNull(),
  severity: varchar("severity", { length: 20 }).default("high"),
  description: text("description"),
  quarantined: boolean("quarantined").default(false),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow(),
});

export const endpointProcesses = pgTable("endpoint_processes", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").notNull().references(() => endpoints.id),
  processName: varchar("process_name", { length: 255 }).notNull(),
  processPath: text("process_path"),
  pid: integer("pid"),
  parentPid: integer("parent_pid"),
  commandLine: text("command_line"),
  username: varchar("username", { length: 255 }),
  hashMd5: varchar("hash_md5", { length: 32 }),
  hashSha256: varchar("hash_sha256", { length: 64 }),
  isSigned: boolean("is_signed"),
  signer: varchar("signer", { length: 255 }),
  isElevated: boolean("is_elevated").default(false),
  isMalicious: boolean("is_malicious").default(false),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const endpointNetworkConnections = pgTable("endpoint_network_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").notNull().references(() => endpoints.id),
  processId: uuid("process_id"),
  direction: varchar("direction", { length: 10 }),
  protocol: varchar("protocol", { length: 20 }),
  localIp: varchar("local_ip", { length: 45 }),
  localPort: integer("local_port"),
  remoteIp: varchar("remote_ip", { length: 45 }),
  remotePort: integer("remote_port"),
  remoteHost: varchar("remote_host", { length: 255 }),
  bytesSent: bigint("bytes_sent", { mode: "number" }).default(0),
  bytesRecv: bigint("bytes_recv", { mode: "number" }).default(0),
  packetsSent: bigint("packets_sent", { mode: "number" }).default(0),
  packetsRecv: bigint("packets_recv", { mode: "number" }).default(0),
  isMalicious: boolean("is_malicious").default(false),
  iocMatched: varchar("ioc_matched", { length: 255 }),
  connectionAt: timestamp("connection_at", { withTimezone: true }).defaultNow(),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  caseNumber: varchar("case_number", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("open"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  ownerId: uuid("owner_id"),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const caseIncidents = pgTable("case_incidents", {
  caseId: uuid("case_id").notNull().references(() => cases.id),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id),
  linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.caseId, t.incidentId] }) }));

export const investigationNotebooks = pgTable("investigation_notebooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  caseId: uuid("case_id"),
  incidentId: uuid("incident_id"),
  authorId: uuid("author_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const investigationNotes = pgTable("investigation_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  investigationId: uuid("investigation_id").notNull().references(() => investigationNotebooks.id),
  authorId: uuid("author_id"),
  authorName: varchar("author_name", { length: 255 }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  cveId: varchar("cve_id", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  cvssScore: numeric("cvss_score", { precision: 3, scale: 1 }),
  cvssVector: varchar("cvss_vector", { length: 100 }),
  epssScore: numeric("epss_score", { precision: 5, scale: 4 }),
  epssPercentile: numeric("epss_percentile", { precision: 5, scale: 4 }),
  severity: varchar("severity", { length: 20 }).notNull(),
  patchStatus: varchar("patch_status", { length: 30 }).default("unpatched"),
  exploitStatus: varchar("exploit_status", { length: 30 }).default("none"),
  affectedPackages: jsonb("affected_packages").default([]),
  referenceLinks: jsonb("reference_links").default([]),
  cweIds: jsonb("cwe_ids").default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  lastModifiedAt: timestamp("last_modified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const assetVulnerabilities = pgTable("asset_vulnerabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  vulnerabilityId: uuid("vulnerability_id").notNull().references(() => vulnerabilities.id),
  assetId: uuid("asset_id").notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 50 }).default("open"),
  riskAccepted: boolean("risk_accepted").default(false),
  riskAcceptedBy: uuid("risk_accepted_by"),
  riskAcceptedAt: timestamp("risk_accepted_at", { withTimezone: true }),
  patchedAt: timestamp("patched_at", { withTimezone: true }),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow(),
});

export const threatActors = pgTable("threat_actors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  aliases: jsonb("aliases").default([]),
  originCountry: varchar("origin_country", { length: 100 }),
  originType: varchar("origin_type", { length: 50 }).default("unknown"),
  description: text("description"),
  motivation: jsonb("motivation").default([]),
  ttps: jsonb("ttps").default([]),
  linkedCampaigns: jsonb("linked_campaigns").default([]),
  severity: varchar("severity", { length: 20 }).default("high"),
  isActive: boolean("is_active").default(true),
  firstSeen: timestamp("first_seen", { withTimezone: true }),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const threatActorTimeline = pgTable("threat_actor_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull().references(() => threatActors.id),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  eventTitle: varchar("event_title", { length: 255 }).notNull(),
  eventDesc: text("event_desc"),
});

export const iocs = pgTable("iocs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  threatActorId: uuid("threat_actor_id").references(() => threatActors.id),
  iocType: varchar("ioc_type", { length: 50 }).notNull(),
  value: text("value").notNull(),
  context: text("context"),
  confidenceScore: integer("confidence_score").default(80),
  severity: varchar("severity", { length: 20 }).default("high"),
  isActive: boolean("is_active").default(true),
  firstSeen: timestamp("first_seen", { withTimezone: true }),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cloudAccounts = pgTable("cloud_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  provider: varchar("provider", { length: 50 }).notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  accountAlias: varchar("account_alias", { length: 255 }),
  regions: jsonb("regions").default([]),
  credentialsEncrypted: text("credentials_encrypted"),
  syncStatus: varchar("sync_status", { length: 50 }).default("healthy"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  totalAssets: integer("total_assets").default(0),
  riskScore: integer("risk_score").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cloudAssets = pgTable("cloud_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  cloudAccountId: uuid("cloud_account_id").notNull().references(() => cloudAccounts.id),
  assetType: varchar("asset_type", { length: 100 }).notNull(),
  assetId: varchar("asset_id", { length: 255 }).notNull(),
  assetName: varchar("asset_name", { length: 255 }),
  region: varchar("region", { length: 50 }),
  availabilityZone: varchar("availability_zone", { length: 50 }),
  vpcId: varchar("vpc_id", { length: 100 }),
  tags: jsonb("tags").default({}),
  configuration: jsonb("configuration").default({}),
  isPublic: boolean("is_public").default(false),
  riskScore: integer("risk_score").default(0),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const cloudIamFindings = pgTable("cloud_iam_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  cloudAccountId: uuid("cloud_account_id").notNull().references(() => cloudAccounts.id),
  principalType: varchar("principal_type", { length: 50 }),
  principalId: varchar("principal_id", { length: 255 }),
  principalName: varchar("principal_name", { length: 255 }),
  findingType: varchar("finding_type", { length: 100 }).notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  affectedResource: text("affected_resource"),
  policyName: varchar("policy_name", { length: 255 }),
  description: text("description"),
  isResolved: boolean("is_resolved").default(false),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow(),
});

export const cloudComplianceChecks = pgTable("cloud_compliance_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  cloudAssetId: uuid("cloud_asset_id").notNull().references(() => cloudAssets.id),
  framework: varchar("framework", { length: 50 }).notNull(),
  controlId: varchar("control_id", { length: 50 }).notNull(),
  controlTitle: varchar("control_title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("failed"),
  remediation: text("remediation"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow(),
});

export const networkFlows = pgTable("network_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  destinationIp: varchar("destination_ip", { length: 45 }).notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  protocol: varchar("protocol", { length: 20 }),
  bytesTotal: bigint("bytes_total", { mode: "number" }).default(0),
  packetsTotal: bigint("packets_total", { mode: "number" }).default(0),
  durationMs: integer("duration_ms"),
  isMalicious: boolean("is_malicious").default(false),
  threatCategory: varchar("threat_category", { length: 100 }),
  geoCountrySrc: varchar("geo_country_src", { length: 2 }),
  geoCountryDst: varchar("geo_country_dst", { length: 2 }),
  geoLatSrc: numeric("geo_lat_src", { precision: 9, scale: 6 }),
  geoLngSrc: numeric("geo_lng_src", { precision: 9, scale: 6 }),
  geoLatDst: numeric("geo_lat_dst", { precision: 9, scale: 6 }),
  geoLngDst: numeric("geo_lng_dst", { precision: 9, scale: 6 }),
  asnSrc: varchar("asn_src", { length: 50 }),
  asnDst: varchar("asn_dst", { length: 50 }),
  endpointId: uuid("endpoint_id"),
  flowStart: timestamp("flow_start", { withTimezone: true }).notNull(),
  flowEnd: timestamp("flow_end", { withTimezone: true }),
});

export const dnsQueries = pgTable("dns_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  endpointId: uuid("endpoint_id"),
  sourceIp: varchar("source_ip", { length: 45 }),
  queryDomain: varchar("query_domain", { length: 512 }).notNull(),
  queryType: varchar("query_type", { length: 10 }).notNull(),
  responseCode: varchar("response_code", { length: 20 }),
  responseIps: jsonb("response_ips"),
  entropyScore: numeric("entropy_score", { precision: 5, scale: 3 }),
  isDga: boolean("is_dga").default(false),
  isBlocklisted: boolean("is_blocklisted").default(false),
  threatCategory: varchar("threat_category", { length: 100 }),
  queriedAt: timestamp("queried_at", { withTimezone: true }).defaultNow(),
});

export const attackGraphs = pgTable("attack_graphs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  incidentId: uuid("incident_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
});

export const attackGraphNodes = pgTable("attack_graph_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  graphId: uuid("graph_id").notNull().references(() => attackGraphs.id),
  nodeType: varchar("node_type", { length: 50 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  assetId: uuid("asset_id"),
  assetType: varchar("asset_type", { length: 50 }),
  isCompromised: boolean("is_compromised").default(false),
  isEntryPoint: boolean("is_entry_point").default(false),
  isTarget: boolean("is_target").default(false),
  riskScore: integer("risk_score").default(0),
  xPos: numeric("x_pos", { precision: 10, scale: 2 }),
  yPos: numeric("y_pos", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata").default({}),
});

export const attackGraphEdges = pgTable("attack_graph_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  graphId: uuid("graph_id").notNull().references(() => attackGraphs.id),
  sourceNodeId: uuid("source_node_id").notNull(),
  targetNodeId: uuid("target_node_id").notNull(),
  relationshipType: varchar("relationship_type", { length: 100 }).notNull(),
  mitreTechnique: varchar("mitre_technique", { length: 50 }),
  isActivePath: boolean("is_active_path").default(false),
  confidenceScore: integer("confidence_score").default(80),
  metadata: jsonb("metadata").default({}),
});

export const runbooks = pgTable("runbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  triggerSeverity: varchar("trigger_severity", { length: 20 }),
  triggerEventTypes: jsonb("trigger_event_types").default([]),
  isAutomated: boolean("is_automated").default(false),
  isEnabled: boolean("is_enabled").default(true),
  executionCount: integer("execution_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const runbookSteps = pgTable("runbook_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  runbookId: uuid("runbook_id").notNull().references(() => runbooks.id),
  stepOrder: integer("step_order").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionPayload: jsonb("action_payload").default({}),
  timeoutSeconds: integer("timeout_seconds").default(60),
  onFailure: varchar("on_failure", { length: 20 }).default("stop"),
  isManual: boolean("is_manual").default(false),
});

export const runbookExecutions = pgTable("runbook_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  runbookId: uuid("runbook_id").notNull().references(() => runbooks.id),
  incidentId: uuid("incident_id"),
  triggeredBy: uuid("triggered_by"),
  status: varchar("status", { length: 20 }).default("running"),
  logOutput: text("log_output"),
  stepResults: jsonb("step_results").default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const complianceAssessments = pgTable("compliance_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  framework: varchar("framework", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalControls: integer("total_controls").default(0),
  passedControls: integer("passed_controls").default(0),
  scorePercent: numeric("score_percent", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 50 }).default("in_progress"),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow(),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
});

export const complianceControls = pgTable("compliance_controls", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => complianceAssessments.id),
  controlId: varchar("control_id", { length: 50 }).notNull(),
  controlTitle: varchar("control_title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("not_started"),
  evidenceNotes: text("evidence_notes"),
  assigneeId: uuid("assignee_id"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  reportType: varchar("report_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  parameters: jsonb("parameters").default({}),
  storageUri: text("storage_uri"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  creatorId: uuid("creator_id"),
  reportType: varchar("report_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  cronSchedule: varchar("cron_schedule", { length: 50 }).notNull(),
  recipients: jsonb("recipients").notNull().default([]),
  parameters: jsonb("parameters").default({}),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  scopes: jsonb("scopes").default([]),
  rateLimitRpm: integer("rate_limit_rpm").default(1000),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastUsedIp: varchar("last_used_ip", { length: 45 }),
  useCount: bigint("use_count", { mode: "number" }).default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  name: varchar("name", { length: 255 }).notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  secretKey: varchar("secret_key", { length: 255 }).notNull(),
  subscribedEvents: jsonb("subscribed_events").default([]),
  headers: jsonb("headers").default({}),
  isActive: boolean("is_active").default(true),
  failureCount: integer("failure_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").notNull().references(() => webhooks.id),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  deliveryTimeMs: integer("delivery_time_ms"),
  retryCount: integer("retry_count").default(0),
  success: boolean("success").default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).defaultNow(),
});

export const platformIntegrations = pgTable("platform_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  configuredBy: uuid("configured_by"),
  provider: varchar("provider", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  credentials: jsonb("credentials").default({}),
  config: jsonb("config").default({}),
  status: varchar("status", { length: 50 }).default("pending"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  eventsIngested: bigint("events_ingested", { mode: "number" }).default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const platformHealthChecks = pgTable("platform_health_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).default("healthy"),
  latencyMs: integer("latency_ms"),
  errorMsg: text("error_msg"),
  metadata: jsonb("metadata").default({}),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow(),
});

export const identityAnomalies = pgTable("identity_anomalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  anomalyType: varchar("anomaly_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  description: text("description"),
  locationFrom: jsonb("location_from"),
  locationTo: jsonb("location_to"),
  speedKmH: numeric("speed_km_h", { precision: 10, scale: 2 }),
  timeDeltaMinutes: integer("time_delta_minutes"),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: uuid("resolved_by"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const alertSuppressionRules = pgTable("alert_suppression_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  condition: text("condition").notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"),
  isEnabled: boolean("is_enabled").default(true),
  violationCount: integer("violation_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notificationChannels = pgTable("notification_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  target: text("target").notNull(),
  config: jsonb("config").default({}),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const routingRules = pgTable("routing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  conditions: jsonb("conditions").notNull().default({}),
  channelId: uuid("channel_id").references(() => notificationChannels.id),
  priority: integer("priority").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const escalationPolicies = pgTable("escalation_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull().default([]),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeBookmarks = pgTable("knowledge_bookmarks", {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  articleId: uuid("article_id").notNull().references(() => knowledgeArticles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.articleId] }) }));

export const ransomwareGroups = pgTable("ransomware_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  encryption: varchar("encryption", { length: 255 }),
  sectors: jsonb("sectors").default([]),
  recentVictims: jsonb("recent_victims").default([]),
  severity: varchar("severity", { length: 20 }).default("high"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const threatCampaigns = pgTable("threat_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  sectors: jsonb("sectors").default([]),
  severity: varchar("severity", { length: 20 }).default("high"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const campaignActors = pgTable("campaign_actors", {
  campaignId: uuid("campaign_id").notNull().references(() => threatCampaigns.id),
  actorId: uuid("actor_id").notNull().references(() => threatActors.id),
}, (t) => ({ pk: primaryKey({ columns: [t.campaignId, t.actorId] }) }));

export const campaignEvents = pgTable("campaign_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => threatCampaigns.id),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
  description: text("description").notNull(),
});

export const caseEvidence = pgTable("case_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  addedBy: uuid("added_by"),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileName: varchar("file_name", { length: 255 }),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  storageUri: text("storage_uri"),
  hashSha256: varchar("hash_sha256", { length: 64 }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const caseTasks = pgTable("case_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("open"),
  assigneeId: uuid("assignee_id"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const caseActivity = pgTable("case_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  actorId: uuid("actor_id"),
  actorName: varchar("actor_name", { length: 255 }),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const caseWatchers = pgTable("case_watchers", {
  caseId: uuid("case_id").notNull().references(() => cases.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.caseId, t.userId] }) }));

export const investigationEvidence = pgTable("investigation_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  investigationId: uuid("investigation_id").notNull().references(() => investigationNotebooks.id),
  addedBy: uuid("added_by"),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileName: varchar("file_name", { length: 255 }),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  storageUri: text("storage_uri"),
  hashSha256: varchar("hash_sha256", { length: 64 }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const investigationEntities = pgTable("investigation_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  investigationId: uuid("investigation_id").notNull().references(() => investigationNotebooks.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityValue: text("entity_value").notNull(),
  notes: text("notes"),
  addedBy: uuid("added_by"),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const huntQueries = pgTable("hunt_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdBy: uuid("created_by"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  query: text("query").notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"),
  scheduleMinutes: integer("schedule_minutes"),
  isEnabled: boolean("is_enabled").default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastHitCount: integer("last_hit_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
