# NEXUS Platform — Complete End-to-End Integration Audit Report

**Date:** 2026-06-08  
**Auditor:** Claude (Cowork AI)  
**Scope:** Full repository — all frontend routes, backend modules, APIs, database, RBAC, realtime, AI, and enterprise features  

---

## Executive Summary

NEXUS has a solid architectural foundation: JWT auth with refresh tokens, multi-tenant Row-Level Security (RLS), a real Drizzle/Postgres database, WebSocket realtime events, OpenAI-backed Copilot, and a properly registered audit-log plugin covering all mutations. However, **large portions of the platform are disconnected from the backend and running on hardcoded static/mock data**. The result is a platform that looks complete visually but fails to persist, retrieve, or act on real data in ~40% of its pages.

**Critical failures by category:**
- **4 backend AI endpoints** called by the frontend do not exist
- **5 modules** have no CRUD beyond a basic GET list (Cases, Investigations, Vulnerabilities, Compliance, Integrations)
- **4 pages** make zero API calls (SSO, Access Matrix, Threat Simulation, Attack Replay)
- **8+ non-functional action buttons** that close modals or set local state without persisting anything
- **Organizations/Users management** is backed entirely by a local Zustand store — not the database

---

## Section 1 — Missing Backend Routes

These are endpoints the frontend calls that **do not exist in the backend**.

| # | Endpoint | Called From | Priority |
|---|----------|-------------|----------|
| 1 | `GET /v1/ai/threat-scoring` | `useThreatScoring()` hook | **CRITICAL** |
| 2 | `GET /v1/ai/anomalies` | `useAnomalyDetection()` hook | **CRITICAL** |
| 3 | `GET /v1/ai/recommendations` | `useAiRecommendations()` hook | **CRITICAL** |
| 4 | `GET /v1/ai/hunt-assist` | `useThreatHuntingAssistant()` hook | **HIGH** |
| 5 | `POST /v1/cases` | Cases page (create) | **HIGH** |
| 6 | `PATCH /v1/cases/:id` | Cases page (update status/assignee) | **HIGH** |
| 7 | `DELETE /v1/cases/:id` | Cases page (delete) | **MEDIUM** |
| 8 | `GET /v1/cases/:id` | Case detail | **HIGH** |
| 9 | `POST /v1/investigations` | Investigations page | **HIGH** |
| 10 | `PATCH /v1/investigations/:id` | Investigations page | **HIGH** |
| 11 | `DELETE /v1/investigations/:id` | Investigations page | **MEDIUM** |
| 12 | `POST /v1/incidents/:id/escalate` | Incident detail (Confirm Escalation btn) | **CRITICAL** |
| 13 | `POST /v1/incidents/:id/postmortem` | Incident detail (Generate Postmortem btn) | **HIGH** |
| 14 | `PATCH /v1/incidents/:id/rca` | Incident detail (RCA step progression) | **HIGH** |
| 15 | `PATCH /v1/incidents/:id/assignee` | Incident detail (reassign) | **HIGH** |
| 16 | `GET /v1/reports/:id/download` | Reports page (Download button) | **HIGH** |
| 17 | `GET /v1/alerts/suppression-rules` | Alerts page (Suppression Rules panel) | **HIGH** |
| 18 | `POST /v1/alerts/suppression-rules` | Alerts page (Add rule) | **HIGH** |
| 19 | `PATCH /v1/alerts/suppression-rules/:id` | Alerts page (toggle rule on/off) | **HIGH** |
| 20 | `DELETE /v1/detection-rules/:id` | Detection Rules (delete rule) | **MEDIUM** |
| 21 | `POST /v1/integrations` | Integrations page | **HIGH** |
| 22 | `PATCH /v1/integrations/:id` | Integrations page | **HIGH** |
| 23 | `DELETE /v1/integrations/:id` | Integrations page | **MEDIUM** |
| 24 | `GET /v1/sso/providers` | SSO page | **HIGH** |
| 25 | `POST /v1/sso/providers` | SSO page (Setup btn) | **HIGH** |
| 26 | `PATCH /v1/sso/providers/:id` | SSO page (MFA/JIT/SCIM toggles) | **HIGH** |
| 27 | `GET /v1/policies` | Policies page | **HIGH** |
| 28 | `PATCH /v1/policies/:id` | Policies page (toggle policy) | **HIGH** |
| 29 | `GET /v1/topology` | Digital Twin page | **MEDIUM** |
| 30 | `GET /v1/compliance/assessments/:id` | Compliance detail | **MEDIUM** |

---

## Section 2 — Pages With Zero API Integration (Fully Static)

These pages make **zero real API calls** — all data is hardcoded. Any interaction is local state only.

| Page | File | Lines | Issues |
|------|------|--------|--------|
| SSO & Identity | `_app.sso.tsx` | 111 | Provider list hardcoded, MFA/JIT/SCIM toggles save to local useState only, "Setup" button has no handler |
| Access Matrix | `_app.access-matrix.tsx` | 151 | Pure RBAC matrix visualization, no API, no persistence |
| Threat Simulation | `_app.threat-simulation.tsx` | 97 | Entire simulation is mock, no backend |
| Attack Replay | `_app.attack-replay.tsx` | 123 | Static replay data, no backend attack graph integration |

**Root Cause:** These modules were scaffolded as UI shells but backend services were never built.

---

## Section 3 — Pages Using Mock Fallback Data

These pages have API hooks but fall back to (or augment with) hardcoded static data.

### 3.1 Cases Page (`_app.cases.tsx`)
- **Problem:** `if (items.length === 0) return CASES` — 10 richly-populated mock cases are shown if the API returns empty. Real cases (which have a much simpler schema: id, caseNumber, title, status, priority, owner) lack linked alerts, linked incidents, endpoints, evidence, activity feed, and remediation checklist fields that the UI expects.
- **Root Cause:** `CasesService` only has a `list()` method returning 6 fields. The frontend `CaseData` interface requires 15+ fields.
- **Fix Required:** Extend cases schema and service to return all fields; add CRUD endpoints.

### 3.2 Alerts Page (`_app.alerts.tsx`)
- **Problem:** Four hardcoded panels shown alongside real alert data:
  - `SUPPRESSIONS` — 4 hardcoded suppression rules, toggle state not persisted
  - `ESCALATION_CHAIN` — static, not configurable
  - `ROUTING_RULES` — static, not editable
  - `CHANNELS` — static notification channel status
- **Fix Required:** Build suppression rules API, escalation policy API, routing rules API.

### 3.3 Incident Detail (`_app.incidents.$incidentId.tsx`)
- **Problem:** Uses `MOCK_RESPONDERS`, `MOCK_SLA`, `MOCK_ESCALATIONS`, `MOCK_REMEDIATIONS` as fallback when real data is absent. Most real incidents won't have these fields populated.
- **Note:** The backend's `mapIncident()` function hardcodes responders/escalations/remediations as static arrays regardless of DB data — so these are always fake.
- **Fix Required:** Populate responders/escalations/remediations from real DB tables.

### 3.4 Policies Page (`_app.policies.tsx`)
- **Problem:** All 5 policy tabs (Detection, Alert, IAM, Endpoint, Retention, AI Governance) use entirely hardcoded `Policy[]` arrays. Toggle state is local Zustand only.
- **Fix Required:** Build policies backend module (schema, service, routes).

### 3.5 Status Page (`_app.status.tsx`)
- **Problem:** Uses `usePlatformHealth()` for KPIs only. The main SERVICES grid, REGIONS map, and MAINTENANCE_WINDOWS are hardcoded static arrays.
- **Fix Required:** Extend platform-health API to return services with uptime stats, regional status, and maintenance windows.

### 3.6 Digital Twin (`_app.digital-twin.tsx`)
- **Problem:** NODES and EDGES topology arrays are hardcoded. Only KPI counts come from `usePlatformHealth()`.
- **Fix Required:** Build a `/v1/topology` endpoint returning real asset/service topology.

### 3.7 Security Graph (`_app.security-graph.tsx`)
- **Problem:** Graph node/edge data is hardcoded static arrays.
- **Fix Required:** Wire to attack-graph API or build dedicated security-graph endpoint.

### 3.8 Timeline Page (`_app.timeline.tsx`)
- **Problem:** Timeline events are generated from hardcoded mock arrays mixed with real incident data.
- **Fix Required:** Build a unified `/v1/timeline` endpoint aggregating events, incidents, and alerts.

---

## Section 4 — Non-Functional Buttons and Actions

Buttons that either have no `onClick` handler, or whose handler only updates local state without making an API call.

| Button | Page | Current Behavior | Required Behavior |
|--------|------|------------------|-------------------|
| **Confirm Escalation** | Incident Detail | Closes modal, clears local state — no API call | `POST /v1/incidents/:id/escalate` |
| **Generate Postmortem** | Incident Detail | Sets `postmortemGenerated = true`, shows static template list | Call Copilot/AI to generate postmortem via `POST /v1/incidents/:id/postmortem` |
| **RCA Step Progression** | Incident Detail | Updates `rcaStep` local state — never saved | `PATCH /v1/incidents/:id/rca` to persist RCA step |
| **Create Workflow** | Automation | No onClick handler | Open create workflow modal → POST to runbooks |
| **Test** | Detection Rules | No onClick handler | `POST /v1/detection-rules/:id/test` |
| **Import** | Detection Rules | No onClick handler | File upload → `POST /v1/detection-rules/import` |
| **Use Template** | Detection Rules | No onClick handler | Pre-fill create rule form with template |
| **Setup** | SSO Page | No onClick handler | Open SSO provider config modal → `POST /v1/sso/providers` |
| **Suppression Rule Toggles** | Alerts | Updates local `Switch` state only | `PATCH /v1/alerts/suppression-rules/:id` |
| **Assign (Workflow)** | Automation | Calls `assignRunbook` API ✓ | Working — but no confirmation toast |
| **Bookmark** | Knowledge | Updates local state only | `PATCH /v1/knowledge/:id/bookmark` |
| **Download (Reports)** | Reports | Creates a fake blob with 2 lines of stub CSV/JSON data | Call `GET /v1/reports/:id/download` |
| **Scheduled Reports (Add/Edit)** | Reports | Static display only, no API | Build `/v1/reports/schedules` API |

---

## Section 5 — Missing CRUD Operations

These backend modules only expose a single `GET` list endpoint. Full CRUD is needed.

| Module | Has | Missing | Impact |
|--------|-----|---------|--------|
| **Cases** | `GET /v1/cases` | POST, PATCH, DELETE, GET /:id | Cannot create or manage cases |
| **Investigations** | `GET /v1/investigations` | POST, PATCH, DELETE, GET /:id | Cannot create or save investigations |
| **Vulnerabilities** | `GET /v1/vulnerabilities` | POST, PATCH status, DELETE | Cannot patch or dismiss vulns |
| **Compliance** | `GET /v1/compliance/assessments` | POST, PATCH control status, GET /:id | Cannot update control status |
| **Integrations** | `GET /v1/integrations` | POST, PATCH status, DELETE | Cannot add or remove integrations |
| **SSO Providers** | Nothing | Full CRUD needed | SSO is entirely non-functional |
| **Policies** | Nothing | Full CRUD needed | Policies are entirely non-functional |

---

## Section 6 — Missing AI/ML Backend Endpoints

The frontend has 4 complete React Query hooks wired to AI endpoints that do not exist in the backend. The only AI endpoint is `POST /v1/ai/score/rescore` (admin-only re-scoring trigger).

| Hook | Calls | Backend Status | Affected Pages |
|------|-------|----------------|----------------|
| `useThreatScoring()` | `GET /v1/ai/threat-scoring` | **MISSING** | Any page using threat scores |
| `useAnomalyDetection()` | `GET /v1/ai/anomalies` | **MISSING** | Hunt, Dashboard |
| `useAiRecommendations()` | `GET /v1/ai/recommendations` | **MISSING** | Incident detail, Dashboard |
| `useThreatHuntingAssistant()` | `GET /v1/ai/hunt-assist` | **MISSING** | Hunt page |

**Fix Required:** Add AI routes module to backend with these four endpoints. The `AlertPriorityService` already computes `aiPriorityScore` per alert — extend it to expose threat scoring, anomaly results (from hunt anomalies), and recommendations.

---

## Section 7 — Organizations / Users Management Security Gap

**Severity: CRITICAL**

The Organizations page (`_app.organizations.tsx`) reads and writes entirely from a **local Zustand store** (`accounts-store`). Creating, editing, or deleting users does not call `/v1/users`. The real user API (`GET /v1/users`) exists and is used by other hooks (`useOrgUsers()`), but the Organizations page completely bypasses it.

**Impact:**
- User additions are lost on page refresh
- User role changes are not persisted to the database
- No audit trail for user management (audit plugin only fires on API mutations)
- Multi-tenant isolation is not enforced for locally-stored accounts

**Fix Required:**
1. Wire `createAccount`, `updateAccount`, `deleteAccount` in the Organizations page to call `POST /v1/users`, `PATCH /v1/users/:id`, `DELETE /v1/users/:id`
2. Add those three endpoints to `users.routes.ts`

Similarly, the **Profile page** (`_app.profile.tsx`) stores sessions, devices, personal access tokens, and OAuth providers entirely in a Zustand `profile-store`. These are never persisted to or loaded from the database.

---

## Section 8 — Incident Responders/Escalations Hardcoded in mapIncident()

**Severity: HIGH**

The `IncidentsService.mapIncident()` function in `incidents.service.ts` hardcodes responders, escalations, and remediations as static arrays on **every incident**, regardless of what is in the database:

```typescript
responders: [
  { name: "k.morgan", role: "lead", joinedAt: startedAt },
  { name: "a.chen", role: "support", ... },
  { name: "m.patel", role: "reviewer", ... },
],
escalations: [
  { from: "medium", to: "high", reason: "Scope expanded...", ... },
  { from: "high", to: "critical", reason: "Active exfiltration...", ... },
],
remediations: [
  { id: "REM-1", title: "Revoke compromised API tokens", status: "complete", ... },
  ...
]
```

This means every incident shows the same 3 fake responders and same 2 fake escalations, regardless of actual incident data.

**Fix Required:** Remove hardcoded arrays; query real data from `incident_responders`, `incident_escalations`, and `incident_remediations` DB tables (or create them if missing).

---

## Section 9 — Realtime / WebSocket Gaps

**Working:** WebSocket endpoint `/v1/ws/events` polls events from DB every 3 seconds and pushes to clients. Authentication via token query param is enforced.

**Gaps:**
1. `useConnectionState()` returns `"connected"` if the user is authenticated — it does not actually check WebSocket connection status
2. `useStreamStats()` generates random lag values (`Math.random() * 5`) instead of real metrics
3. No realtime push for: incident status changes, alert acknowledgements, case updates — only raw events are streamed

---

## Section 10 — Audit Logging

**Status: WORKING ✓**

The `auditLogPlugin` in `apps/api/src/plugins/audit-log.ts` is properly registered in `app.ts` and automatically logs all `POST`, `PUT`, `PATCH`, `DELETE` mutations to the audit table via an `onResponse` hook. It fires after every successful mutation with the actor's identity, action path, and resource type.

**Gap:** Since Organizations and Profile pages bypass the API entirely, user management operations generate no audit log entries.

---

## Section 11 — RBAC Analysis

**Frontend RBAC: WORKING ✓**

- `ROLE_PERMISSIONS` matrix covers all 7 roles and 50+ permissions
- `permissionForPath()` correctly maps routes to required permissions
- `_app.tsx` root layout enforces route-level access control
- `AccessDenied` component properly shown for unauthorized access
- Backend `requirePermission()` middleware enforced on all API routes

**Gaps:**
1. No `act:cases`, `manage:cases` permissions defined — cases mutations unprotected if endpoints are added
2. `manage:sso`, `manage:policies` permissions missing from RBAC definitions
3. `POST /v1/knowledge` uses `view:knowledge` permission instead of a write permission — any viewer can create articles

---

## Section 12 — Reports Generation Gap

**Current State:** The Reports page calls `POST /v1/reports` which creates a DB row with `status: "pending"`. The download button constructs a **fake 2-line blob** client-side:

```typescript
const downloadReport = (report, format) => {
  const content = format === "csv"
    ? `id,title,type,status,generatedAt\n${payload.id},...\n`
    : `NEXUS Report\n\n${payload.title}\nType: ${payload.type}\n...`;
  // Creates a local Blob and downloads it
```

No actual report content is ever generated. The `storageUri` field in the DB is always null.

**Fix Required:**
1. Background job/worker to generate report content (PDF/CSV) after creation
2. `GET /v1/reports/:id/download` endpoint to serve the generated file
3. Status webhook or polling to update report `status` from `pending` → `ready`

---

## Section 13 — Performance Issues

1. `IncidentsService.list()` runs N+2 sub-queries per row (recommendations + timeline for each incident) — this is an N+1 pattern that will be slow at scale. Should use a single JOIN with aggregation.
2. WebSocket polling every 3 seconds is inefficient for high-event-volume orgs — should use Postgres LISTEN/NOTIFY or a message queue.
3. `useStreamStats()` uses `setInterval` with `Math.random()` — wastes CPU with meaningless updates.

---

## Priority Matrix

### CRITICAL (Fix Immediately — Breaks Core Workflows)

| ID | Issue | Files |
|----|-------|-------|
| C-1 | Incident escalation button does nothing | `_app.incidents.$incidentId.tsx` → need `POST /v1/incidents/:id/escalate` |
| C-2 | Organizations page stores users in local Zustand, never persists to DB | `_app.organizations.tsx`, `accounts-store.ts` → need user CRUD in `users.routes.ts` |
| C-3 | `mapIncident()` hardcodes responders/escalations/remediations | `incidents.service.ts` lines ~270-310 |
| C-4 | 4 AI endpoints called by frontend don't exist in backend | `api-hooks.ts` → need AI routes module |
| C-5 | SSO page is fully non-functional (0 API calls) | `_app.sso.tsx` → need SSO backend module |

### HIGH (Significant Feature Gaps)

| ID | Issue | Files |
|----|-------|-------|
| H-1 | Cases: no create/update/delete | `cases.routes.ts`, `cases.service.ts`, `_app.cases.tsx` |
| H-2 | Investigations: no create/update/delete | `investigations.routes.ts`, `investigations.service.ts` |
| H-3 | Policies page is 100% static mock data | `_app.policies.tsx` → need policies backend |
| H-4 | Alert suppression rules not persisted | `_app.alerts.tsx` → need `/v1/alerts/suppression-rules` |
| H-5 | Reports download serves fake blob | `_app.reports.tsx`, `reports.routes.ts` → need download endpoint |
| H-6 | Generate Postmortem button does nothing real | `_app.incidents.$incidentId.tsx` → need postmortem AI endpoint |
| H-7 | Profile page sessions/devices/tokens are local state only | `_app.profile.tsx`, `profile-store.ts` |
| H-8 | Detection rules: Test/Import buttons have no handlers | `_app.detection-rules.tsx` |
| H-9 | `POST /v1/knowledge` uses `view:knowledge` permission | `knowledge.routes.ts` line ~20 |

### MEDIUM (Incomplete Features)

| ID | Issue | Files |
|----|-------|-------|
| M-1 | Vulnerabilities: no patch/dismiss operations | `vulnerabilities.routes.ts` |
| M-2 | Status page SERVICES/REGIONS arrays hardcoded | `_app.status.tsx`, `platform-health.routes.ts` |
| M-3 | Digital twin topology is hardcoded | `_app.digital-twin.tsx` → need `/v1/topology` |
| M-4 | Timeline page mixes real + mock data | `_app.timeline.tsx` → need unified timeline API |
| M-5 | Incident RCA steps not persisted | `_app.incidents.$incidentId.tsx` → `PATCH /v1/incidents/:id/rca` |
| M-6 | Attack Replay is 100% static | `_app.attack-replay.tsx` |
| M-7 | Threat Simulation is 100% static | `_app.threat-simulation.tsx` |
| M-8 | `useConnectionState()` fakes WS status | `realtime.ts` |
| M-9 | Missing `manage:cases`, `manage:sso`, `manage:policies` permissions | `rbac.ts` |
| M-10 | N+1 query in incidents list | `incidents.service.ts` → batch with JSON aggregation |

### LOW (Polish / Non-Breaking)

| ID | Issue | Files |
|----|-------|-------|
| L-1 | Knowledge bookmark not persisted | `_app.knowledge.tsx` |
| L-2 | Automation "Create Workflow" has no onClick | `_app.automation.tsx` |
| L-3 | `useStreamStats()` returns random values | `realtime.ts` |
| L-4 | Compliance controls can't be updated | `compliance.routes.ts` |
| L-5 | Scheduled reports section is purely visual | `_app.reports.tsx` |

---

## Implementation Plan

### Phase 1 — Critical Fixes (Week 1)

**Step 1: Fix `mapIncident()` hardcoded data**
- File: `apps/api/src/modules/incidents/incidents.service.ts`
- Remove static responders/escalations/remediations arrays
- Query from real DB tables (add `incidentResponders`, `incidentEscalations`, `incidentRemediations` tables to schema if absent)

**Step 2: Wire Organizations page to real API**
- File: `src/routes/_app.organizations.tsx`
- Replace `useAccounts()` Zustand calls with `useOrgUsers()`, `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()`
- Add `POST /v1/users`, `PATCH /v1/users/:id`, `DELETE /v1/users/:id` to `users.routes.ts`

**Step 3: Add Incident Escalation API**
- File: `apps/api/src/modules/incidents/incidents.routes.ts`
- Add `POST /v1/incidents/:id/escalate` — updates severity, writes to `incident_timeline`
- File: `src/routes/_app.incidents.$incidentId.tsx`
- Wire "Confirm Escalation" button to mutation

**Step 4: Build AI Routes Module**
- New file: `apps/api/src/modules/ai/ai.routes.ts`
- `GET /v1/ai/threat-scoring` — compute from alerts + endpoints risk scores
- `GET /v1/ai/anomalies` — pull from hunt anomalies data
- `GET /v1/ai/recommendations` — generate from incident context
- `GET /v1/ai/hunt-assist` — call LLM adapter to optimize hunt query

**Step 5: Add Incident Postmortem**
- File: `apps/api/src/modules/incidents/incidents.routes.ts`
- Add `POST /v1/incidents/:id/postmortem` → calls LlmAdapter with incident context → streams result
- Wire "Generate Postmortem" button to streaming endpoint

### Phase 2 — High Priority (Week 2)

**Step 6: Cases full CRUD**
- Extend `cases.service.ts`: `create()`, `update()`, `delete()`, `getById()`
- Extend `cases.routes.ts`: POST, PATCH /:id, DELETE /:id, GET /:id
- Fix `_app.cases.tsx` to remove static `CASES` fallback, use API data directly

**Step 7: Alert Suppression Rules API**
- Add `suppressionRules` table to schema
- Build `suppression-rules.routes.ts` with full CRUD
- Wire `_app.alerts.tsx` Suppression Rules panel to API

**Step 8: Policies Backend**
- Add `policies` table to schema (name, category, enabled, severity, config jsonb)
- Build `policies.routes.ts`
- Wire `_app.policies.tsx` all 5 tabs to API

**Step 9: Reports Download**
- Add `GET /v1/reports/:id/download` to `reports.routes.ts`
- Generate real CSV content from DB query based on `reportType`
- Fix `downloadReport()` in `_app.reports.tsx` to call the endpoint

**Step 10: Fix Knowledge Write Permission**
- File: `apps/api/src/modules/knowledge/knowledge.routes.ts`
- Change `POST /v1/knowledge` preHandler from `view:knowledge` to `manage:knowledge`
- Add `manage:knowledge` permission to `rbac.ts`

### Phase 3 — Medium Priority (Week 3)

**Step 11: Investigations CRUD** — extend routes + service + fix frontend  
**Step 12: Vulnerability Patch/Dismiss** — add PATCH endpoint + UI action  
**Step 13: Platform Health Real Data** — extend API to return SERVICES/REGIONS from DB  
**Step 14: RCA Persistence** — add `PATCH /v1/incidents/:id/rca` + wire frontend  
**Step 15: Fix `useConnectionState()`** — track actual WebSocket readyState  
**Step 16: RBAC gaps** — add `manage:cases`, `manage:sso`, `manage:policies` permissions  

### Phase 4 — Lower Priority (Week 4+)

**Step 17:** Fix N+1 in `IncidentsService.list()` with JSON aggregation  
**Step 18:** Build SSO backend module (provider management, SAML/OIDC config)  
**Step 19:** Profile page — wire sessions/devices/tokens to real session DB tables  
**Step 20:** Digital Twin topology API  
**Step 21:** Timeline unified API  

---

## What Is Working Well

These features are properly integrated end-to-end and should **not** be changed:

- Auth (login, logout, JWT refresh, multi-tenant isolation via RLS)
- Incidents: list, detail, status updates, comments, evidence, timeline, SLA, responders API
- Alerts: list, acknowledge, suppress similar, create incident from alert
- Events: live stream with WebSocket + DB polling
- Copilot: full streaming AI chat with session persistence, LLM fallback when no API key
- Detection Rules: list, toggle enable/disable, create new rule with full form
- Endpoints: list with search
- Vulnerabilities: list with search
- Threat Intelligence: actors, IOCs, ransomware, campaigns
- Hunt: queries, anomalies, results
- Forensics: file events, process tree, binaries
- Cloud Security: summary, resources, accounts, IAM findings, storage, compliance
- Network: flows, DNS queries
- Knowledge: list, detail, create article
- Reports: list, create (pending status)
- Runbooks/Automation: list, assign workflow
- Attack Graphs: list
- Audit Log: list with search; automatic mutation logging plugin
- Platform Health: live service status
- Integrations: list
- Developer: API keys (CRUD), webhooks (CRUD)
- Notifications: list, mark read, mark all read
- Dashboard: real stats
- Executive: real summary
- RBAC: complete permission matrix, route guards, backend enforcement

---

*End of Audit Report — NEXUS Platform v1.x*
