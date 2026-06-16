# NEXUS — DEFINITIVE MASTER PLAN (Audit · Reviews · Productionization Blueprint)

> Reverse-engineered from the current codebase. Goal: take NEXUS from its current state to a world-class,
> enterprise-scale, AI-native SOC platform with zero mock data, zero disconnected workflows, complete
> persistence, RBAC+RLS enforcement, observability, auditability, and production reliability.
> **Effort:** S ≤1d · M 2–3d · L 5–8d · XL 10–15d · XXL >15d. **Priority:** P0 blocker · P1 core · P2 completeness · P3 polish.

---

# PART I — EXECUTIVE ARCHITECTURE REVIEW

**Stack (verified):** Monorepo (bun workspaces `apps/*`, `packages/*`). Frontend = Vite + React + TanStack Router (file-based `src/routes/_app.*.tsx`) + TanStack Query + Zustand + shadcn/ui + Tailwind. Backend = Fastify 5 (`apps/api`, 34 modules) + Drizzle ORM + Postgres 16 (pgvector image) + Redis + BullMQ (wired in Phase 0). Shared = `@nexus/shared` (Zod DTOs/enums), `@nexus/ai-contracts` (prompts/PII/model defaults), `@nexus/db` (Drizzle schema + tenant helpers).

**Maturity (post Phase 0):** Backend ~90% real DB-backed (33/34 modules query Drizzle). Frontend renders mostly-real data; the residual mock risk is **seeded Zustand stores**, **a few static config arrays in 6 routes**, and **4 backend stubs**. Multi-tenancy via Postgres RLS keyed on `app.current_org`; Phase 0 fixed connection pinning (`SET LOCAL` in txn) and added child-table RLS + indexes.

**Headline gaps:** (1) 4 backend stubs (forensics, hunt saved-queries/anomalies, threat-intel ransomware/campaigns, AI hunt-assist); (2) missing mutation **endpoints** (cloud connect/sync, network mark-malicious, vuln exception, endpoint unisolate/scan, IOC writes, alert escalation/routing/channel CRUD, case sub-resources); (3) missing **frontend hooks** for endpoints that already exist; (4) **store seeds** substituting for backend (accounts/profile/preferences/notifications); (5) **no pgvector RAG**, OpenAI-only→Phase-0 added Anthropic; (6) **no tests/CI**; (7) **no SaaS/billing**; (8) **integrations are stubs**; (9) **no observability/backups/HA**.

---

# PART II — CURRENT STATE ASSESSMENT (audit of all 20 dimensions)

### 1. Routes (49 files in `src/routes/`)
All `_app.*.tsx` + `login.tsx`. Real-data routes: dashboard, executive, events, incidents(+detail), alerts, cases, endpoints, vulnerabilities, cloud-security, network, threat-intelligence, compliance, reports, runbooks/automation, knowledge, developer, notifications, organizations, audit, copilot, hunt, search/query, policies, integrations, platform-health, identity. **Static-array routes:** `_app.alerts.tsx` (SUPPRESSIONS/ESCALATION_CHAIN/ROUTING_RULES/CHANNELS), `_app.incidents.$incidentId.tsx` (MOCK_RESPONDERS/SLA/ESCALATIONS/REMEDIATIONS — now superseded by Phase-0 `mapIncident`), `_app.attack-graph.tsx` (NODES/EDGES/DEP_EDGES/PATHS), `_app.security-graph.tsx` (GRAPH_NODES/EDGES + correlation-store), `_app.digital-twin.tsx` (NODES/EDGES), `_app.onboarding.tsx` (config labels). **Presentation-only constants** (keep): status-style maps, severity color maps, graph layout POSITIONS, TYPE_STYLES, REL_COLORS, onboarding step labels.

### 2. Components (`src/components/`)
8 domain components (app-sidebar, app-topbar, command-palette, inspector-panel, metric-card, module-preview, role-switcher, severity-badge) + 50 shadcn `ui/*` + ux-utilities, workspace-context/switcher, access-denied. **Form primitive (`ui/form.tsx`) exists but is under-used** — most forms are hand-rolled. **No reusable `<EmptyState>/<ErrorBoundary>/<DataTable>` standardization** beyond `ux-utilities.tsx`.

### 3. React Query hooks (`src/lib/api-hooks.ts`, 100 hooks)
Strong read coverage. Mutation **gaps**: incidents create/delete; cases create/delete + sub-resources; detection-rule delete; runbook create/update/delete/execute; knowledge update/delete/bookmark; vuln detail/exception; endpoint unisolate/scan/processes/connections; threat-intel IOC CRUD; cloud connect/sync/resolve; network mark-malicious; hunt save/schedule/run; policy update/delete; webhook update/test/deliveries; report schedule; alert escalation/routing/channel CRUD; org update/invite; profile sessions/devices/PAT; preferences update. (Several backend endpoints for these now exist post-Phase-0 → only the hook is missing.)

### 4. Zustand stores (`src/lib/`)
`workspace-store` (7 importers, local-only — KEEP), `inspector-store` (6, UI state — KEEP), `profile-store` (2, seeded — MIGRATE), `preferences-store` (2, defaults — MIGRATE), `incident-store` (2, overrides — REPLACE w/ mutations), `correlation-store` (1, security-graph — KEEP local), `accounts-store` (1, seeded — MIGRATE/RETIRE; organizations.tsx already uses `useOrgUsers`), `notifications-store` (reconcile w/ `useApiNotifications` via `use-merged-notifications`), `collaboration-store` (no live importers — likely DEAD), `auth-store` (session — KEEP). **`use-api-with-fallback.ts` is DEAD CODE** (self-referenced only) — routes do not fall back to mock; remove it.

### 5. API endpoints / 6. Backend modules / 7. Services (34 modules)
Real DB: alerts, attack-graph, audit, auth, cases, cloud(read), compliance, copilot, dashboard, detection-rules, developer, endpoints, events, incidents, integrations(read), investigations, knowledge, network(read), notifications, organizations, platform-health, policies, reports, runbooks, search, threat-intel(actors/iocs), users, vulnerabilities(read+patch), ai(scoring/anomalies/recommendations), realtime(WS poll). **Stubs:** forensics (hardcoded DEFAULT_DATA), hunt (listQueries/listAnomalies static), threat-intel (ransomware/campaigns static), ai hunt-assist (static suggestions).

### 8. Tables (57 Drizzle) / 9. Migrations
`organizations, roles, users, user_sessions, security_events, alert_rules, alerts, incidents, incident_{timeline,comments,evidence,recommendations,mitre_techniques,alerts,responders}, copilot_{sessions,messages}, knowledge_articles, notifications, audit_logs, endpoints, endpoint_{malware_indicators,processes,network_connections}, cases, case_incidents, investigation_{notebooks,notes}, vulnerabilities, asset_vulnerabilities, threat_actors, threat_actor_timeline, iocs, cloud_{accounts,assets,iam_findings,compliance_checks}, network_flows, dns_queries, attack_graphs, attack_graph_{nodes,edges}, runbooks, runbook_{steps,executions}, compliance_{assessments,controls}, reports, scheduled_reports, api_keys, webhooks, webhook_deliveries, platform_integrations, platform_health_checks, identity_anomalies, alert_suppression_rules, policies`. Migrations: `001_schema`, `002_rls_and_rag` (RLS on 26 parents; **pgvector + FTS commented out**), seeds `002/004/005/099`, `006_permissions`, `007_suppression`, `008_policies`, `009_investigation_notes`, **Phase-0 `010_child_rls`, `011_indexes`**. **Missing tables (new):** case_evidence/tasks/activity/watchers, investigation_evidence/entities, hunt_queries, escalation_policies/routing_rules/notification_channels, ransomware_groups/threat_campaigns/campaign_actors, knowledge_bookmarks, user_preferences/personal_access_tokens/user_devices, platform_services/regions/maintenance_windows, document_embeddings(uncomment), plans/subscriptions/invoices/usage_counters, email_verifications/password_reset_tokens/sso_providers, feature_flags.

### 10. DTOs / 11. Schemas (`@nexus/shared`, 260-line schemas + 57-line enums)
Centralized Zod for events/incidents/alerts/dashboard exist; **most new endpoints use inline `z.object()` in routes** (no shared contract). No OpenAPI generation. Frontend imports DTO types from `@nexus/shared` — good, but many response shapes are untyped `apiFetch<{...}>` inline.

### 12. Integrations
`platform_integrations` table + read endpoint only. **No connector framework**, no Slack/Teams/AWS/CrowdStrike/etc. Inbound ingestion APIs absent (data is seed-only).

### 13. AI workflows
Copilot chat with sessions/messages/SSE + keyword-ILIKE RAG (`rag.service.ts`) + Phase-0 Anthropic branch. Threat scoring (hardcoded confidence), anomalies (identity table), recommendations (from alerts), hunt-assist (stub). **No vector RAG, no embeddings, no tool-calling, no token budgets.**

### 14. WebSocket
`/v1/ws/events` polls `security_events` every 3s, broadcasts events only. Token in query string. **No per-channel authz, no incident/alert/notification push, faked `lagMs`.**

### 15. Security controls / 16. RBAC / 17. RLS
Phase 0 fixed: RLS pinning, demo-password (prod-off)+lockout, JWT prod-default refusal, AES-GCM crypto, SSRF guard, api-key middleware, write-on-view perms (added manage:detection-rules/act:investigations/act:reports/act:automation). RLS: 26 parents (002) + ~20 children (010). **Remaining:** every NEW table needs RLS; audit not append-only; WS token-in-URL; no MFA/SSO runtime; rate-limit per-IP only.

### 18. Reports / 19. Workflows / 20. User journeys
Reports: create + CSV download real; **no async generation, scheduling delivery, PDF**. Core journeys (event→incident→investigation→close; alert→ack→escalate) work. **Broken/partial journeys:** case lifecycle (no sub-resources UI), endpoint forensics (stub), cloud onboarding (no connect), hunt save/schedule, runbook execute UI, billing/signup (absent), onboarding submit (no backend).

---

# PART III — DOMAIN REVIEWS

- **Technical Debt:** dead code (`use-api-with-fallback.ts`); inline Zod (no shared DTO layer); store seeds masquerading as data; hand-rolled forms; untyped `apiFetch` responses; `incident-store` client overrides; ILIKE search; faked stream stats.
- **Security:** all Phase-0 P0s closed; remaining P1s — new-table RLS, append-only audit, WS ticket auth, MFA/SSO, per-user/key rate limits, evidence upload validation+AV, XSS sanitization on markdown, prompt-injection hardening, RAG org+permission filter.
- **Scalability:** single API instance; no PgBouncer (pairs with RLS txn pinning); `security_events` unpartitioned; ILIKE not FTS; no read replica; WS poll not push; no queue-depth autoscaling.
- **AI:** keyword RAG → must become pgvector vector RAG with citations + cross-tenant-leak test; calibrate threat scoring; rolling-baseline anomalies; tool-calling (perm-gated, human-in-loop); token budgets→`usage_counters`.
- **Data Architecture:** rich schema, soft FKs in places (promote where safe); missing uniques/CHECKs; no soft-delete/retention; no embeddings.
- **Frontend:** standardize forms on `ui/form.tsx`+RHF+Zod; EmptyState/Skeleton/ErrorBoundary everywhere; optimistic updates; a11y + mobile pass; WS subscriptions.
- **Backend:** finish 4 stubs; add missing mutation endpoints; shared DTO layer; audit diff capture; WS event bus.
- **Database:** reconcile any residual drift (`drizzle-kit check`); add new tables + RLS + indexes + constraints; uncomment pgvector/FTS.
- **Infrastructure:** CI (tsc/lint/test/drizzle-check/build); web prod image; worker service (Phase-0 compose); MinIO (added); Sentry/OTel/Prometheus; backups/PITR; HA.
- **Realtime:** push events from API bus; WS ticket auth; real lag metric.
- **Integration:** connector framework + inbound ingestion + outbound notifiers.
- **Testing:** Vitest+Testcontainers (RLS isolation, services), Playwright E2E, k6 load, AI-eval, security suite — currently ~0.
- **Production Readiness:** observability + backups + HA + run scripts + smoke + secrets manager.
- **Compliance:** SOC2/GDPR mapping; append-only audit; retention config (`organizations.data_retention_days`); tenant export/delete.
- **Risk:** cross-tenant leak (mitigated, keep isolation tests under concurrency); detection engine (Phase-0 added scaffolding — verify auto-fire); RAG leak; no backups; single instance.

---

# PART IV — GAP REGISTER (condensed; full per-task metadata in Part VIII)

Missing features: case sub-resources, endpoint forensics(real)+actions, cloud connect/sync, IOC writes, hunt save/schedule, runbook execute UI, report scheduling, signup/billing, MFA/SSO, integrations, admin portal, tenant export/delete.
Missing APIs/CRUD: see Wave A (Part V) — ~14 endpoint groups.
Missing persistence: profile/preferences/notifications/accounts → DB; collaboration/correlation (decided local-only).
Missing audit trail: cloud-sync, runbook-exec, billing, responder changes → ensure audited + diff cols.
Missing realtime: incident.updated/alert.created/notification.created/sla.breached push.
Missing AI: vector RAG, embeddings, tool-calling, budgets, calibrated scoring.
Missing enterprise: SaaS, SSO/MFA, quotas, plans, export/delete, admin.
Missing observability: metrics/logs/traces/Sentry/dashboards/alerts.
Missing testing: all tiers.
Scalability bottlenecks: PgBouncer, partitioning, FTS, replica, push.
Architectural weaknesses: inline DTOs, hand-rolled forms, dead code, store-as-data.
Production risks/blockers: no CI, no backups, no SaaS, no observability.
Compliance gaps: append-only audit, retention purge, export/delete, SOC2 mapping.
Data-model weaknesses: missing uniques/CHECKs/soft-delete; embeddings.
Mismatches: FE hooks ↔ existing BE endpoints; store seeds ↔ DB; ILIKE ↔ FTS.

---

# PART V — PHASED ROADMAP (Phases & Waves)

**PHASE 1 — Zero-Mock Core (the user's immediate goal).** Make every security domain fully connected & persistent.
- Wave A (Backend completion): finish 4 stubs + add missing mutation endpoints + new tables + RLS. *(Part VII tables.)*
- Wave E (Rich seed): `030_demo_seed.sql` so wired pages are alive.
- Wave B (Frontend hooks): add ~40 missing mutation/query hooks to `api-hooks.ts`.
- Wave C/C+ (Route wiring + Forms): remove static arrays; build every form (catalog below) on `ui/form.tsx`+RHF+Zod+sonner; EmptyState/Skeleton/ErrorBoundary; optimistic updates; RBAC-gate write controls.
- Wave D (Store migration): profile/preferences/notifications/accounts → API; delete `use-api-with-fallback.ts`; keep workspace/inspector/correlation local.
- Wave F (Realtime): API event bus → WS push; real lag.
- Wave G (Run/Go-live): run scripts, migrations applied, smoke per domain (create→persist→reload), `tsc`/`drizzle-check` clean.

**PHASE 2 — Detection/SOAR/Reports/Webhooks engines** (Phase-0 scaffolding → verified auto-fire; async report gen + scheduling; webhook HMAC/retry/SSRF/DLQ; escalation/routing/channel dispatch).

**PHASE 3 — Telemetry/Intel/AI depth** (inbound ingestion APIs; pgvector + EmbeddingService + VectorRagService + citations; tool-calling; calibrated scoring; real cloud sync AWS-first).

**PHASE 4 — SaaS commercialization** (signup/org-create/email-verify; plans/subscriptions/Stripe+webhook; usage metering+quota; trials; onboarding backend; SSO/MFA; tenant export/delete; admin portal).

**PHASE 5 — Integrations/Observability/GA** (connector framework + Slack/Teams/AWS/Azure/GCP/CrowdStrike/Defender/Sentinel/Elastic/Splunk/VT/RF/AbuseIPDB/Jira/ServiceNow/Email/SMS; Prometheus+OTel+Grafana+Sentry; PITR backups+restore; HA replicas+PgBouncer+Redis persistence; web prod image/CDN; load+chaos+pen tests; SOC2).

---

# PART VI — DOMAIN-BY-DOMAIN EXECUTION (Phase 1 order)

Order (each end-to-end BE→hook→route→form→test before next): **incidents → alerts → endpoints/forensics → threat-intel → cloud → vulnerabilities → network → hunt → cases → runbooks/automation → knowledge → developer/webhooks → policies → reports → graphs(attack/security/digital-twin) → onboarding → organizations/profile/settings/notifications.**

For each domain the slice is identical: (1) ensure BE endpoints+service real & audited; (2) add/verify RLS on its tables; (3) add hooks in `api-hooks.ts`; (4) wire route, delete static arrays; (5) build forms (Part VII catalog); (6) seed rows; (7) integration + E2E test; (8) RBAC-gate.

---

# PART VII — FILE / ROUTE / API / TABLE / MIGRATION / HOOK / STORE PLANS

### Wave A — Backend endpoints/services
| # | Module | Add | Tables | Migration |
|---|---|---|---|---|
|A1|forensics|real queries → endpoint_processes/network_connections/malware_indicators|existing|—|
|A2|endpoints|`POST /:id/unisolate`,`/scan`,`GET /:id/processes`,`/network`|existing|—|
|A3|hunt|`hunt_queries` CRUD + `/:id/run`; AnomalyService(z-score over security_events)|hunt_queries|015|
|A4|threat-intel|wire ransomware/campaigns; IOC `POST/PATCH/DELETE`+import|ransomware_groups,threat_campaigns,campaign_actors|017|
|A5|ai|hunt-assist→`LlmAdapter.complete()` NL→DSL|—|—|
|A6|cloud|`POST/DELETE accounts`,`POST /:id/sync`,`PATCH /iam-findings/:id/resolve` (creds via crypto)|existing|—|
|A7|network|`PATCH /flows/:id` mark-malicious|existing|—|
|A8|vulnerabilities|`GET /:id`,`POST /:id/exception`,bulk|existing(asset_vulnerabilities)|—|
|A9|alerts|escalation/routing/channel CRUD|escalation_policies,routing_rules,notification_channels|016|
|A10|cases|evidence/tasks/activity/watchers + wire case_incidents|case_evidence,case_tasks,case_activity,case_watchers|012|
|A11|reports|`POST /schedule` + status lifecycle|scheduled_reports(exists)|—|
|A12|developer|`PATCH /webhooks/:id`,`/:id/test`,`/:id/deliveries`|webhook_deliveries(exists)|—|
|A13|investigations|evidence/entities|investigation_evidence,investigation_entities|013|
|A14|knowledge|bookmark|knowledge_bookmarks|018|
All: register in `modules/register.ts`; add to `schema.ts`; RLS policy per new table (extend `010` pattern); indexes in `011`.

### Wave B — Hooks (`src/lib/api-hooks.ts`)
Add: `useCreateIncident/useDeleteIncident/useUpdateIncident/useRemoveIncidentResponder/useAddIncidentEvidence`; `useCreateCase/useDeleteCase/useCase*` (evidence/tasks/activity/watchers); `useDeleteDetectionRule` + fix `useTestDetectionRule`; `useCreateRunbook/useUpdateRunbook/useDeleteRunbook/useExecuteRunbook/useRunbookExecutions`; `useUpdateKnowledgeArticle/useDeleteKnowledgeArticle/useBookmarkKnowledge`; `useUnisolateEndpoint/useScanEndpoint/useEndpointProcesses/useEndpointConnections` + real `useForensics`; `useVulnerability/useVulnException`+bulk; `useCreateIoc/useUpdateIoc/useDeleteIoc/useImportIocs`; `useSaveHuntQuery/useUpdateHuntQuery/useDeleteHuntQuery/useRunHuntQuery`; `useConnectCloudAccount/useDeleteCloudAccount/useSyncCloudAccount/useResolveIamFinding`; `useMarkFlowMalicious`; escalation/routing/channel CRUD; `useUpdatePolicy/useDeletePolicy`; `useUpdateWebhook/useTestWebhook/useWebhookDeliveries`; `useScheduleReport/useReportSchedules`; `useUpdateOrg/useInviteUser`; `useSessions/useRevokeSession`; `useUpdatePreferences`. Pattern = lines 66–100 (`useMutation`+`qc.invalidateQueries`).

### Wave C — Route wiring (delete static arrays)
incidents.$incidentId (MOCK_*→real `useIncident`), incidents (incident-store→mutations), alerts (4 arrays→CRUD), cases(+new $caseId), detection-rules(delete/edit/test/import), endpoints(+new $id forensics/actions), forensics(real), threat-intelligence(IOC+real intel), cloud-security(connect wizard), network(mark-malicious), hunt(save/schedule), vulnerabilities(detail/exception/bulk), automation(builder/execute/history), knowledge(edit/delete/bookmark), developer(webhook edit/test/log), policies(CRUD), reports(generate/schedule), attack-graph/security-graph/digital-twin(generate; keep layout consts), onboarding(submit).

### Wave C+ — FORMS catalog (every form, RHF+Zod+sonner+hook+isPending+confirm on destructive)
`<IncidentForm>`,`<ManageRespondersDialog>`,`<EvidenceUploadDialog>`,`<EscalateIncidentDialog>`,`<SuppressionRuleForm>`,`<EscalationPolicyBuilder>`,`<RoutingRuleBuilder>`,`<ChannelConfigForm>`,`<DetectionRuleForm>`/`<ImportRulesDialog>`/`<RuleTestModal>`,`<CaseForm>`+tabs(`<CaseEvidenceTab>`,`<CaseTasksTab>`,`<CaseWatchers>`,`<LinkIncidentPicker>`),`<EndpointActionsBar>`/`<ProcessTree>`/`<NetworkConnections>`,`<IocForm>`/`<IocImportDialog>`,`<ConnectCloudWizard>`/`<ResolveFindingDialog>`,`<FlowDetailDrawer>`,`<VulnExceptionForm>`/`<VulnDetailDrawer>`,`<SaveHuntQueryDialog>`/`<ScheduleHuntDialog>`,`<RunbookBuilder>`/`<StepEditor>`/`<ExecuteRunbookDialog>`/`<ExecutionHistory>`,`<KnowledgeEditor>`(DOMPurify),`<WebhookForm>`/`<DeliveryLog>`,`<PolicyForm>`,`<GenerateReportForm>`/`<ScheduleReportForm>`,`<InviteUserDialog>`/`<EditUserDialog>`,profile(`<RevokeSessionButton>`/`<CreatePatDialog>`),settings prefs forms,onboarding 5-step submit,`<GenerateGraphDialog>`/`<SimulationConfigForm>`. RBAC-gate via `can(role,perm)`.

### Wave D — Stores
Migrate profile-store→sessions/devices/PAT/preferences API; preferences-store→`useUpdatePreferences`; notifications-store→reconcile via `use-merged-notifications`+API; accounts-store→retire (organizations uses `useOrgUsers`). Delete `use-api-with-fallback.ts` (dead). Keep workspace/inspector/correlation/auth local.

### Migrations to author
`012_case_subresources`, `013_investigation_subresources`, `015_hunt_queries`, `016_alert_policies`, `017_threat_intel`, `018_knowledge_bookmarks`, `019_user_prefs_pat_devices`, `021_pgvector_embeddings`(uncomment 002), `030_demo_seed`. Each with `.down.sql` + RLS + indexes. Phases 4–5 add `020/022/023/024/025` (saas/auth-security/soft-delete).

---

# PART VIII — TASK REGISTER (representative; each carries the full metadata schema)

Schema per task: **Pri · Deps · Effort · Risk · Files · DB impact · Security impact · Testing · Validation · Rollback.**

1. **Forensics real** — P1 · A-none · M · Med · `forensics.service.ts`,`endpoints.routes.ts` · reads 3 endpoint tables · RLS via `010` · integration test forensics returns seeded rows · validate process tree renders · rollback: revert service (no schema change).
2. **hunt_queries + CRUD + anomalies** — P1 · 015 · M · Med · `hunt.*`,`schema.ts`,`015_*.sql` · new table+RLS+index · tenant-scoped · unit(z-score)+integration · saved query persists+runs · rollback: `015.down`.
3. **threat-intel tables + IOC writes** — P1 · 017 · M · Med · `threat-intel.*`,`schema.ts`,`017_*` · 3 tables+RLS · IOC org-scoped · integration · IOC create/import persists · rollback: `017.down`.
4. **cloud connect/sync/resolve** — P1 · A6,crypto · L · High · `cloud.*` · writes assets/iam/compliance · creds AES-GCM, SSRF on sync · integration(manual connector) · account syncs sample assets · rollback: revert routes.
5. **alert policies (escal/routing/channel)** — P1 · 016 · M · Med · `alerts/*`,`016_*` · 3 tables+RLS · dispatch SSRF · integration · rule routes alert · rollback: `016.down`.
6. **case sub-resources** — P1 · 012 · L · Med · `cases/*`,`012_*` · 4 tables+RLS · org-scoped · integration · task/evidence persist+activity logged · rollback: `012.down`.
7. **endpoint actions** — P1 · A2 · M · Med · `endpoints.*` · updates isolate cols · audited · integration · isolate/unisolate persists · rollback: revert.
8. **vuln exception** — P1 · A8 · S · Low · `vulnerabilities.*` · asset_vulnerabilities cols · audited · integration · exception persists · rollback: revert.
9. **network mark-malicious** — P2 · A7 · S · Low · `network.*` · flow col · audited · integration · flag persists · rollback: revert.
10. **AI hunt-assist real** — P2 · A5 · S · Med · `ai.routes.ts` · none · injection guard · eval · returns valid DSL · rollback: revert.
11. **~40 frontend hooks** — P1 · A-all · L · Low · `api-hooks.ts` · none · none · contract test FE↔BE shapes · each hook 200/persist · rollback: revert hunk.
12. **Forms (Wave C+)** — P1 · 11 · XL · Med · `src/components/*`,`src/routes/*` · none · RBAC-gate+DOMPurify · Playwright per form · create→persist→reload · rollback: revert route.
13. **Store migration** — P1 · 11 · M · Low · `*-store.ts`,routes · none · none · E2E profile/settings persist server-side · rollback: revert.
14. **Rich seed** — P1 · A-tables · M · Low · `030_demo_seed.sql` · inserts all domains · demo-org keyed · manual: every page non-empty · rollback: `030.down`.
15. **Realtime push** — P1 · events-bus(Phase0) · M · Med · `realtime/websocket.routes.ts`,`realtime.ts` · none · WS ticket authz · WS test · live incident update · rollback: revert.
16. **Delete dead code** — P0 · none · S · Low · rm `use-api-with-fallback.ts` · none · none · tsc clean · no importers · rollback: restore.
17. **Shared DTO layer** — P2 · none · L · Low · `@nexus/shared/schemas` · none · none · contract+OpenAPI drift · endpoints use shared · rollback: revert.
18. **pgvector RAG** — P1(Ph3) · 021 · L · Med · `021_*`,`rag.service.ts`,`EmbeddingService` · embeddings table+ivfflat · org+perm filter, leak test · eval hit-rate · cites org data · rollback: `021.down`.
19. **CI + Vitest+Testcontainers + RLS isolation** — P0 · none · M · Low · `.github/workflows`,`apps/api/test` · none · isolation under pool concurrency · CI green · 2-org no cross-read · rollback: disable workflow.
20. **Playwright E2E (8 flows)** — P1 · 12,14 · L · Low · `e2e/` · none · authz negatives · CI green · flows pass · rollback: skip.
*(Phases 2–5 expand to detection-engine verify, async reports, webhook HMAC/retry, ingestion APIs, embeddings pipeline, tool-calling, Stripe/SaaS, SSO/MFA, connectors, observability, backups/HA, load/chaos/pen — each with the same metadata; tracked as they enter scope.)*

---

# PART IX — CROSS-CUTTING

**Testing:** unit (mappers/scoring/DSL/RBAC/crypto/SLA), integration (route↔service↔DB+audit+tenant scope, migration up/down on Testcontainers), contract (`@nexus/shared` Zod ↔ I/O + OpenAPI drift), E2E (Playwright 8 core flows), security (RBAC matrix, SSRF, XSS, SQLi, secret-in-DTO), RLS isolation (2-org + pool-concurrency fuzz), AI-eval (citations/injection/grounding), load (k6), chaos. Gates: services ≥80%, modules ≥70%, security P0 100%.
**Observability:** `fastify-metrics` `/metrics`; pino JSON + `x-request-id`; OTel spans route→service→DB→LLM→queue; Sentry via `SENTRY_DSN`; Grafana dashboards + alerts.
**Deployment:** `docker compose up` (api+worker+postgres+redis+minio — Phase-0); web prod image (Vite→nginx or Cloudflare Pages); GitHub Actions PR gate (tsc/lint/test/drizzle-check/build) + main (E2E/security) + nightly (load/AI/chaos); blue/green + expand→contract migrations; backups PITR + restore runbook; HA (API replicas+HPA, PgBouncer txn pooling pairs w/ RLS pinning, Redis persistence, read replica, partition security_events at high EPS).
**Secrets/Config:** `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, `JWT_*`, `S3_*`, `SMTP_*`, `STRIPE_*`, `SENTRY_DSN`, `OTEL_*` via secrets manager; refuse dev defaults in prod (Phase-0).

---

# VERIFICATION (definition of done for Phase 1 "zero-mock, go-live")

1. `bun install`; apply `010,011,012,013,015,016,017,018,030`; `bun run --filter @nexus/api migrate`; `drizzle-kit check` no drift.
2. `tsc` clean (web+api); eslint clean.
3. `docker compose up` → login with seeded demo user.
4. Per-domain manual smoke (create→persist→**reload**→still there + audited): incident (+evidence/responders/escalate/close), suppression/routing/channel rule, endpoint forensics+isolate/unisolate, hunt save+run, IOC add, cloud connect+sync, flow mark-malicious, vuln exception, runbook build+execute, knowledge edit/delete, webhook edit+test (delivery logged), report generate+schedule, case task/evidence, org invite, profile session revoke, settings prefs.
5. `grep -r "const MOCK_\|const SUPPRESSIONS\|const ESCALATION_CHAIN\|const ROUTING_RULES\|const CHANNELS\|GRAPH_NODES" src/routes` → only presentation constants remain; `use-api-with-fallback.ts` deleted.
6. RLS 2-org isolation test green (incl. all new tables, under pool concurrency); WS pushes live updates; Vitest+Playwright green in CI.

---

## Session Log

- **2026-06-16 (session 1)**: Audited Wave A (14 items) against actual codebase. Result: A2/A8/A10/A11/A12/A13 PARTIAL (base CRUD exists, sub-resources/actions missing); A1/A4/A5/A6/A7/A9/A14 NOT STARTED; A3 PARTIAL (executeQuery is real, saved queries are not). Zero new Wave-A schema tables exist yet. Confirmed `use-api-with-fallback.ts` has no real importers → deleted. Shipped A9 (alert escalation/routing/channels), A1 (forensics real data), A2 (endpoint unisolate/scan/processes/network) + matching frontend hooks.
- **2026-06-16 (session 2)**: User said "implement this plan and complete it." Shipped the remaining 11 Wave A items: A3 (hunt_queries + real z-score anomaly detection), A4 (ransomware_groups/threat_campaigns/campaign_actors/campaign_events + IOC CRUD/import), A5 (hunt-assist now calls LlmAdapter.complete()), A6 (cloud connect/delete/sync/resolve — also fixed a real pre-existing gap: cloud_accounts/cloud_assets/cloud_iam_findings had zero RLS), A7 (network mark-malicious), A8 (vuln detail + exception), A10 (case_evidence/tasks/activity/watchers), A11 (report scheduling), A12 (webhook PATCH/test/deliveries), A13 (investigation_evidence/entities), A14 (knowledge_bookmarks). Added migrations 013–018. Added ~45 matching frontend hooks to api-hooks.ts. **Wave A is now fully complete.** Dependencies still aren't installed in the working environment (no bun on PATH), so none of this was tsc-verified — reviewed manually instead. Next: Wave C (frontend route wiring + forms), or wherever the user redirects. Phases 2–5 (SaaS/billing, SSO, third-party connectors, observability) need external credentials/business decisions this session can't make unilaterally.
