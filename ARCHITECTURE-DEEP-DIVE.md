# NEXUS — Deep Dive: Database, API & End‑to‑End Connections

Companion to [PROJECT-DOCUMENTATION.md](PROJECT-DOCUMENTATION.md). This file goes **table‑by‑table, endpoint‑by‑endpoint**, and traces how the **frontend, backend, and database** physically connect.

---

## Part A — How the Database Connection Works

### A.1 The driver & pool
`packages/db/src/index.ts`:

```ts
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 20, idle_timeout: 20 }); // postgres-js pool
  const db = drizzle(client, { schema });                                   // Drizzle ORM over the pool
  return { db, client };
}
```

- **`client`** = raw `postgres-js` connection pool (max 20 connections). Used for `set_config`, `SELECT 1` health checks, raw SQL.
- **`db`** = Drizzle ORM instance wrapping that same pool. Used for all typed queries.
- Both are created once at boot in `apps/api/src/app.ts` and **decorated onto Fastify**: `app.db`, `app.pgClient`. Every service receives them via its constructor `new XService(app.db, app.pgClient)`.

### A.2 Tenant isolation (RLS) — the most important DB concept
```ts
// packages/db/src/index.ts
export async function setTenantContext(client, orgId) {
  await client`SELECT set_config('app.current_org', ${orgId}, false)`;
}
// apps/api/src/lib/tenant.ts
export async function withTenant(client, orgId, fn) {
  await setTenantContext(client, orgId);
  return fn();
}
```
Every tenant table has a Postgres policy like:
```sql
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY cases_org_policy ON cases
  USING (organization_id::text = current_setting('app.current_org', true));
```
So once `app.current_org` is set, **Postgres itself filters every SELECT/UPDATE/DELETE** to that org. The application code adds `eq(table.organizationId, orgId)` too, as defence‑in‑depth.

### A.3 Migrations
- `database/migrations/NNN_name.sql` files run in order by `apps/api/src/scripts/migrate.ts`.
- A `_migrations` table records applied files so re‑runs are idempotent.
- Migration files create tables, enable RLS, add policies, and seed demo data (`002_seed.sql`, `004_seed_full.sql`, `005_users_and_rich_seed.sql`, `099_seed_demo.sql`).
- **New this session:** `009_investigation_notes.sql`.

---

## Part B — Every Table, Its Purpose & Its Connections

Legend: **PK** primary key · **FK→** hard foreign key (Drizzle `.references`) · **soft→** logical UUID link (no DB constraint) · `org` = `organization_id`.

### B.1 Tenancy & Identity (the root of everything)
| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `organizations` | The tenant. **Root of the entire graph** — almost every table points here. | PK `id` |
| `roles` | RBAC role + `permissions[]` JSON | FK→ `organizations` (nullable; system roles are global) |
| `users` | People in an org | FK→ `organizations`, FK→ `roles` |
| `user_sessions` | Refresh-token sessions | FK→ `users` |

> `organization_id` is the spine: **~90% of tables hang off `organizations`** and are RLS‑isolated by it. `users` is the second hub — referenced (often softly) as author/owner/assignee across incidents, cases, investigations, notifications, audit, identity anomalies, copilot.

### B.2 Telemetry (the raw signal)
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `security_events` | **Raw SIEM events** — the single source feeding the live stream, the Events page, and Threat Hunting results. | FK→ `organizations` |

### B.3 Detection & Alerting
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `alert_rules` | Saved detection logic (query, severity, schedule) | FK→ `organizations`, soft→ `users` (created_by) |
| `alerts` | Fired alerts (priority score, ack/suppress/escalate flags) | FK→ `organizations` |
| `alert_suppression_rules` | Active suppression conditions (e.g. "type=X AND severity=Y") | FK→ `organizations` |
| `policies` | Governance policies + violation counts | FK→ `organizations` |

**Flow:** `alert_rules` evaluate `security_events` → create `alerts` → an alert can be **escalated into an `incident`** (`POST /v1/alerts/:id/incident`) or **suppressed** (creates an `alert_suppression_rules` row).

### B.4 Incident Response (a tightly-connected cluster)
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `incidents` | The incident record (code, severity, status, RCA, summary) | FK→ `organizations`, soft→ `users` (lead_investigator_id) |
| `incident_timeline` | Chronological actions (status change, escalation, RCA, remediation entries) | FK→ `incidents` |
| `incident_comments` | Analyst comments / system notes (also used to back responders, escalations, RCA steps) | FK→ `incidents`, soft→ `users` (author) |
| `incident_evidence` | Attached artifacts (file, log, memory, network) | FK→ `incidents`, soft→ `users` (added_by) |
| `incident_recommendations` | Ordered remediation checklist | FK→ `incidents` |

> An incident is the **hub of response**: timeline + comments + evidence + recommendations all FK→ `incidents`. Incidents are created **from alerts** or **from events**, and an incident **spawns an investigation notebook** (see B.6).

### B.5 Case Management
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `cases` | Higher-level case wrapping alerts/incidents; has owner, status, priority, workflow | FK→ `organizations`, soft→ `users` (owner_id) |

### B.6 Investigations (workspace)
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `investigation_notebooks` | Markdown investigation notebook | FK→ `organizations`, soft→ `cases`, soft→ `incidents`, soft→ `users` (author) |
| `investigation_notes` **(new)** | Collaborative timestamped notes on a notebook | FK→ `organizations`, **FK→ `investigation_notebooks`**, soft→ `users` (author) |

> The **incident ↔ investigation link** is `investigation_notebooks.incident_id`. "Open Full Investigation" get‑or‑creates the notebook for that incident; notes hang off the notebook.

### B.7 Vulnerability Management
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `vulnerabilities` | **Global** CVE catalogue (CVSS, EPSS, patch/exploit status) — *no org_id* | PK `id`, unique `cve_id` |
| `asset_vulnerabilities` | Per‑tenant link: which asset has which CVE + status | FK→ `organizations`, **FK→ `vulnerabilities`**, soft→ asset |

> The Vulnerabilities page joins `vulnerabilities` ⟕ `asset_vulnerabilities` to count affected assets per org. *(Note: patch status currently lives on the global row — see roadmap.)*

### B.8 Endpoints (EDR)
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `endpoints` | Managed devices with multi-factor risk scores (`risk_overall/malware/network/credential/behavior`), isolation state | FK→ `organizations` |
| `endpoint_malware_indicators` | Malware IOCs found on a device | FK→ `endpoints` |

### B.9 Threat Intelligence
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `threat_actors` | **Global** actor profiles (TTPs, motivation, campaigns) | unique `name` |
| `threat_actor_timeline` | Actor activity timeline | FK→ `threat_actors` |
| `iocs` | Indicators of compromise | FK→ `organizations` (nullable), FK→ `threat_actors` |

### B.10 Cloud Security
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `cloud_accounts` | Connected AWS/GCP/Azure accounts | FK→ `organizations` |
| `cloud_assets` | Discovered cloud resources | FK→ `cloud_accounts` |
| `cloud_iam_findings` | IAM misconfigurations | FK→ `cloud_accounts` |

### B.11 Network
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `network_flows` | Flow records (src/dst/proto/bytes, maliciousness, geo) | FK→ `organizations` |
| `dns_queries` | DNS lookups (DGA/blocklist/entropy) | FK→ `organizations` |

### B.12 Attack Graph
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `attack_graphs` | A graph (optionally tied to an incident) | FK→ `organizations`, soft→ `incidents` |
| `attack_graph_nodes` | Nodes (assets, identities, entry/target) | FK→ `attack_graphs` |
| `attack_graph_edges` | Directed relationships w/ MITRE technique | FK→ `attack_graphs`, soft→ nodes |

### B.13 SOAR / Runbooks
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `runbooks` | Automated/manual response playbooks | FK→ `organizations` |
| `runbook_steps` | Ordered steps | FK→ `runbooks` |

### B.14 Compliance
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `compliance_assessments` | Framework assessment (SOC2/ISO/etc.) w/ score | FK→ `organizations` |
| `compliance_controls` | Individual controls + status | FK→ `compliance_assessments` |

### B.15 AI Copilot
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `copilot_sessions` | Chat sessions (workflow type, optional incident context) | FK→ `organizations`, FK→ `users`, soft→ `incidents` |
| `copilot_messages` | Messages w/ token/latency telemetry | FK→ `copilot_sessions` |

### B.16 Knowledge & Platform/Ops
| Table | Purpose | Relationships |
|-------|---------|---------------|
| `knowledge_articles` | KB articles/runbook docs | FK→ `organizations` |
| `reports` | Generated reports (CSV/etc.) | FK→ `organizations` |
| `api_keys` | Programmatic access keys (hashed) | FK→ `organizations` |
| `webhooks` | Outbound event subscriptions | FK→ `organizations` |
| `platform_integrations` | 3rd‑party connectors (sync status, events ingested) | FK→ `organizations` |
| `platform_health_checks` | **Global** service health pings | — |
| `identity_anomalies` | Risky-user signals (impossible travel, MFA) | FK→ `organizations`, FK→ `users` |
| `notifications` | In-app notifications | FK→ `organizations`, FK→ `users` (nullable) |
| `audit_logs` | **Who did what, when** — written by every mutation | FK→ `organizations`, soft→ `users`, soft→ resource |

### B.17 The relationship graph (text ERD)
```
organizations (ROOT)
 ├─ users ──< user_sessions
 │    └─(soft author/owner/assignee)─ incidents, cases, investigation_notebooks,
 │                                     incident_comments, notifications, identity_anomalies,
 │                                     copilot_sessions, audit_logs
 ├─ roles
 ├─ security_events ............................. (Events page, Hunt results, live stream)
 ├─ alert_rules ─ evaluate ─> security_events ─> alerts ─┬─> incidents (escalate)
 │                                                       └─> alert_suppression_rules (suppress)
 ├─ incidents ──< incident_timeline
 │           ──< incident_comments
 │           ──< incident_evidence
 │           ──< incident_recommendations
 │           ──(soft)── attack_graphs, copilot_sessions
 │           ──(via incident_id)── investigation_notebooks ──< investigation_notes
 ├─ cases ──(soft)── investigation_notebooks
 ├─ vulnerabilities(GLOBAL) ──< asset_vulnerabilities >── organizations
 ├─ endpoints ──< endpoint_malware_indicators
 ├─ threat_actors(GLOBAL) ──< threat_actor_timeline,  ──< iocs >── organizations
 ├─ cloud_accounts ──< cloud_assets,  ──< cloud_iam_findings
 ├─ network_flows,  dns_queries
 ├─ attack_graphs ──< attack_graph_nodes,  ──< attack_graph_edges
 ├─ runbooks ──< runbook_steps
 ├─ compliance_assessments ──< compliance_controls
 ├─ copilot_sessions ──< copilot_messages
 ├─ knowledge_articles, reports, api_keys, webhooks, platform_integrations, policies
 └─ notifications, identity_anomalies, audit_logs
platform_health_checks (GLOBAL, standalone)
```

---

## Part C — Complete API Reference (all endpoints)

All routes are under `/v1`, JSON, JWT‑guarded (except `/auth/login|refresh`), Zod‑validated, RLS‑scoped. `WS` = WebSocket.

### Auth & Org
| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/login` | Email+password → access/refresh tokens |
| POST | `/v1/auth/refresh` | Rotate access token |
| POST | `/v1/auth/logout` | Revoke session |
| GET | `/v1/auth/me` | Current user profile |
| GET | `/v1/orgs/current` | Current organization |
| GET | `/v1/users` · POST `/v1/users` · PATCH `/v1/users/:id` · DELETE `/v1/users/:id` | Org user management |
| GET | `/v1/users/identity-anomalies` | Risky-user signals |

### Events & Hunt
| Method | Path | Purpose | Tables |
|---|---|---|---|
| GET | `/v1/events` · `/v1/events/:id` | List / get security events | `security_events` |
| POST | `/v1/events/:id/investigation` | Create notebook from event | `investigation_notebooks` |
| POST | `/v1/events/:id/suppress-similar` | **(new)** Persist suppression rule + count | `alert_suppression_rules`, `security_events`, `audit_logs` |
| POST | `/v1/events/:id/incident` | **(new)** Open incident from event | `incidents`, `incident_timeline`, `incident_recommendations`, `audit_logs` |
| GET | `/v1/hunt/queries` · `/v1/hunt/anomalies` | Saved queries / anomalies |
| GET | `/v1/hunt/results` | **(rewired)** Run hunt over real telemetry (filters, total, pagination) | `security_events` |
| GET | `/v1/ai/hunt-assist` | AI query suggestions |

### Alerts & Detection
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/alerts` | List alerts |
| PATCH | `/v1/alerts/:id/acknowledge` · `/v1/alerts/:id/suppress-similar` | Ack / suppress |
| POST | `/v1/alerts/:id/incident` | Escalate alert → incident |
| GET/POST/PATCH/DELETE | `/v1/alerts/suppression-rules[/:id]` | Suppression rule CRUD |
| GET/POST | `/v1/detection-rules` · PATCH `/:id` · POST `/:id/test` · POST `/import` | Detection-rule management |
| GET/POST/DELETE/PATCH | `/v1/policies[...]` `/toggle` | Governance policies |
| GET | `/v1/ai/threat-scoring` · `/ai/anomalies` · `/ai/recommendations` · POST `/ai/score/rescore` | AI/ML scoring |

### Incidents
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/incidents` · `/:id` | List / get |
| PATCH | `/:id/status` · `/:id/assignee` · `/:id/rca` | Update incident |
| GET/POST | `/:id/comments` | Comments |
| GET | `/:id/timeline` · `/:id/evidence` · `/:id/sla` | Detail panels |
| GET/POST | `/:id/responders` · `/:id/escalations` (+ POST `/:id/escalate`) | Responders/escalation |
| GET/POST/PATCH | `/:id/remediations[/:remId]` | Remediation tracking |
| POST | `/:id/postmortem` | Generate postmortem template |
| POST | `/:id/investigation` | **(new)** Get‑or‑create linked investigation + auto status |

### Cases & Investigations
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/v1/cases` · GET/PATCH/DELETE `/:id` | Case CRUD (**PATCH now incl. `ownerId` + audit**) |
| GET/POST | `/v1/investigations` · GET/PATCH/DELETE `/:id` | Notebook CRUD |
| GET/POST | `/v1/investigations/:id/notes` | **(new)** Collaborative notes |

### Vulnerabilities, Endpoints, Forensics
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/vulnerabilities` · PATCH `/:id` | List / **Mark Patched·Dismiss (now audited)** |
| GET | `/v1/endpoints` · `/:id` · POST `/:id/isolate` | EDR |
| GET | `/v1/forensics/:endpointId` | Forensic artifacts |

### Threat Intel, Cloud, Network, Attack Graph
| GET | `/v1/threat-intel/actors·iocs·ransomware·campaigns` · `/v1/cloud/summary·resources·accounts·iam-findings·storage·compliance` · `/v1/network/flows·dns` · `/v1/attack-graphs[/:id]` |

### Dashboard, Reports, Copilot, Platform
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/dashboard/stats` · `/dashboard/executive` | KPI aggregates |
| GET/POST | `/v1/reports` · GET `/:id/download` | **Export = create + download CSV** (`dashboard_summary` now aggregates incidents/alerts/vulns) |
| GET/POST | `/v1/copilot/sessions[/:id/messages]` | AI chat |
| GET | `/v1/search` · `/v1/audit` · `/v1/notifications` (+PATCH read) · `/v1/knowledge[/:id]` · `/v1/compliance/assessments` · `/v1/runbooks` (+assign) · `/v1/integrations` · `/v1/developer/api-keys·webhooks` · `/v1/health/platform·status` |
| WS | `/v1/ws/events` | Live event stream |

---

## Part D — The Three‑Way Connection (FE ↔ BE ↔ DB), traced

Each row below is a **complete vertical slice** you can follow in code.

| # | UI action (component) | Frontend hook (`api-hooks.ts`) | HTTP endpoint | Service method | Tables touched |
|---|---|---|---|---|---|
| 1 | Events Inspector → **Suppress similar** (`inspector-panel.tsx`) | `useSuppressSimilarEvents` | `POST /v1/events/:id/suppress-similar` | `EventsService.suppressSimilar` | `security_events` (read+count), `alert_suppression_rules` (insert), `audit_logs` |
| 2 | Events Inspector → **Create incident** | `useCreateIncidentFromEvent` | `POST /v1/events/:id/incident` | `EventsService.createIncidentFromEvent` | `incidents`, `incident_timeline`, `incident_recommendations`, `audit_logs` |
| 3 | Dashboard → **Export** (`_app.dashboard.tsx`) | `useExportReport` | `POST /v1/reports` then `GET /v1/reports/:id/download` | `ReportsService.create` + `generateCsv` | `reports`, aggregates `incidents`+`alerts`+`vulnerabilities` |
| 4 | Dashboard → **Ask Copilot** | — (router) | navigate `/copilot` | `CopilotService` | `copilot_sessions`, `copilot_messages` |
| 5 | Incident → **Open Full Investigation** (`_app.incidents.$incidentId.tsx`) | `useOpenIncidentInvestigation` | `POST /v1/incidents/:id/investigation` | `InvestigationsService.getOrCreateForIncident` (+ `updateStatus`) | `investigation_notebooks`, `incidents` (status), `incident_timeline`, `audit_logs` |
| 6 | Cases → **Assignee** / **Workflow step** (`_app.cases.tsx`) | `useUpdateCase` (+`useOrgUsers`) | `PATCH /v1/cases/:id` | `CasesService.update` | `cases`, `users` (name lookup), `audit_logs` |
| 7 | Vulnerabilities → **Mark Patched / Dismiss** (`_app.vulnerabilities.tsx`) | `usePatchVulnerability` | `PATCH /v1/vulnerabilities/:id` | `VulnerabilitiesService.updateStatus` | `vulnerabilities`, `audit_logs` |
| 8 | Investigations → **Save** / **New Note** (`_app.investigations.tsx`) | `useUpdateInvestigation` / `useAddInvestigationNote` | `PATCH /v1/investigations/:id` / `POST /:id/notes` | `InvestigationsService.update` / `addNote` | `investigation_notebooks`, `investigation_notes`, `audit_logs` |
| 9 | Hunt → **Run** (`_app.hunt.tsx`) | `useHuntResults` | `GET /v1/hunt/results?query&limit&offset` | `HuntService.executeQuery` | `security_events` |

### D.1 Why the UI auto‑refreshes
Mutations declare `onSuccess: qc.invalidateQueries({ queryKey: [...] })`. React Query then **refetches** the affected list/detail queries, so the table/badge/count updates with no manual reload. Example: patching a vulnerability invalidates `["vulnerabilities"]`, `["dashboard"]`, and `["audit"]` → the table, the dashboard KPI, and the audit log all refresh.

### D.2 Why every layer agrees on shape
- Request/response **shapes are Zod schemas in `@nexus/shared`** → the same TypeScript types (`SecurityEventDto`, `IncidentDto`, …) are imported by both the Fastify routes and the React hooks. Change the schema once, both sides update.
- **Table shapes** come from `@nexus/db` Drizzle schema → services map rows to DTOs (camelCase, ISO dates). The DTO is the contract; the DB row is internal.

### D.3 The auth thread that ties it together
1. `POST /v1/auth/login` → tokens stored in `localStorage["nexus.tokens"]`.
2. `apiFetch` adds `Authorization: Bearer` on every call; refreshes on 401.
3. `authenticate()` decodes the JWT → `request.user.orgId`.
4. `withTenant(orgId)` sets `app.current_org` → **RLS scopes every query**.
5. Mutations write `audit_logs` with that user → full traceability.

So a single user identity flows: **browser token → JWT → `orgId` → RLS row filter → audit row**, end to end.

---

## Part E — Reading Order for a New Engineer
1. `packages/shared/src/schemas/index.ts` — the contracts.
2. `packages/db/src/schema.ts` — the tables (this doc, Part B).
3. `apps/api/src/app.ts` + `modules/register.ts` — boot + route map.
4. One vertical slice end‑to‑end, e.g. **#7 Vulnerabilities** (Part D) — it's the smallest complete loop.
5. `src/lib/api-client.ts` + `api-hooks.ts` — how the FE talks to all of the above.

---

## Part F — Full Data Dictionary (every column)

Notation: `type` · **PK**/**UQ**(unique)/**NN**(not null) · `= default` · **FK→**/**soft→**. JSON columns are `jsonb`. All `timestamp` are `with time zone`. UUIDs default to `gen_random_uuid()`.

### F.1 `organizations` — the tenant root
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| name | varchar(255) | **NN** — display name |
| slug | varchar(100) | **NN UQ** — URL/identifier |
| industry | varchar(100) | optional sector |
| settings | jsonb | `= {}` — per-org config blob |
| created_at / updated_at | timestamp | `= now()` |

### F.2 `roles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| organization_id | uuid | **FK→ organizations** (nullable: system roles are global) |
| name | varchar(100) | **NN** — e.g. `security_admin` |
| description | text | |
| permissions | jsonb | **NN** `= []` — array of permission strings (`view:incidents`, `act:incidents`, …) |
| is_system | bool | `= false` — built-in role flag |
| created_at | timestamp | `= now()` |

### F.3 `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| organization_id | uuid | **NN FK→ organizations** |
| role_id | uuid | **FK→ roles** |
| email | varchar(255) | **NN UQ** — login id |
| full_name | varchar(255) | **NN** |
| password_hash | varchar(255) | bcrypt hash (nullable for demo/SSO users) |
| avatar_seed | varchar(255) | deterministic avatar |
| workspace_name | varchar(255) | UI workspace label |
| status | varchar(50) | `= active` (`active`/`suspended`/`invited`) |
| last_login_at | timestamp | updated on login |
| created_at / updated_at | timestamp | `= now()` |

### F.4 `user_sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| user_id | uuid | **NN FK→ users** |
| refresh_token | varchar(512) | **NN UQ** |
| ip_address | varchar(45) | IPv4/IPv6 |
| user_agent | text | |
| is_revoked | bool | `= false` — logout sets true |
| expires_at | timestamp | **NN** |
| created_at | timestamp | `= now()` |

### F.5 `security_events` — raw SIEM telemetry (Events + Hunt source)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| organization_id | uuid | **NN FK→ organizations** |
| event_timestamp | timestamp | **NN** — when the event occurred (ordering key) |
| type | varchar(50) | **NN** — `failed_login`, `malware_detection`, `dns_anomaly`, … |
| severity | varchar(20) | **NN** — `critical`/`high`/`medium`/`low`/`info`/`healthy` |
| source | varchar(255) | **NN** — emitting sensor/integration |
| source_ip / dest_ip | varchar(45) | network endpoints |
| username | varchar(255) | actor identity |
| host | varchar(255) | affected host |
| rule_name | varchar(255) | detection that fired |
| message | text | **NN** — human-readable description |
| country_code | varchar(2) | geo of source |
| asset | varchar(255) | affected asset |
| mitre_technique | varchar(100) | ATT&CK technique id |
| raw_data | jsonb | `= {}` — original payload (bytes, proto, session, …) used by Hunt |

### F.6 Detection — `alert_rules`, `alerts`, `alert_suppression_rules`, `policies`
**`alert_rules`**
| Column | Type | Notes |
|---|---|---|
| id | uuid **PK** | |
| organization_id | uuid **NN FK→ organizations** | |
| created_by | uuid | soft→ users |
| name | varchar(255) **NN** | |
| description | text | |
| query | text **NN** | detection logic |
| severity | varchar(20) **NN** | |
| mitre_tactics / mitre_techniques / data_sources | jsonb `= []` | tagging |
| run_frequency_minutes | int `= 5` · lookback_minutes | int `= 60` · threshold_count | int `= 1` | schedule |
| is_enabled | bool `= true` | |
| false_positive_count / true_positive_count | int `= 0` | tuning metrics |
| created_at / updated_at | timestamp `= now()` | |

**`alerts`**
| Column | Type | Notes |
|---|---|---|
| id | uuid **PK** | |
| organization_id | uuid **NN FK→ organizations** | |
| title | varchar(255) **NN** | |
| description | text | |
| severity | varchar(20) **NN** | |
| status | varchar(20) `= new` | `new`→`triaging`→`acknowledged`/`escalated`/`suppressed`/`resolved` |
| ai_priority_score | int `= 0` | 0–100 ranking |
| dedup_count | int `= 1` | duplicate rollup |
| is_escalated / is_acknowledged / is_suppressed | bool `= false` | state flags |
| raw_trigger_data | jsonb `= {}` | |
| created_at / updated_at | timestamp `= now()` | |

**`alert_suppression_rules`** — id **PK** · organization_id **NN FK→ organizations** · name **NN** · condition text **NN** (e.g. `type='x' AND severity='y'`) · created_by varchar(255) · expires_at · is_active `= true` · created_at/updated_at.
**`policies`** — id **PK** · organization_id **NN FK→** · name **NN** · description · category(50) **NN** · severity `= medium` · is_enabled `= true` · violation_count `= 0` · last_triggered_at · created_at/updated_at.

### F.7 Incident cluster
**`incidents`**
| Column | Type | Notes |
|---|---|---|
| id | uuid **PK** | |
| organization_id | uuid **NN FK→ organizations** | |
| incident_code | varchar(50) **NN UQ** | e.g. `INC-240349` |
| title | varchar(255) **NN** | |
| description | text | |
| severity | varchar(20) **NN** | |
| status | varchar(20) `= open` | `open`→`investigating`→`contained`→`eradicated`→`recovered`→`closed` |
| lead_investigator_id | uuid | soft→ users (assignee) |
| category | varchar(100) | |
| affected_assets_count / affected_users_count | int `= 0` | blast radius |
| summary / root_cause_analysis | text | |
| opened_at / updated_at | timestamp `= now()` | |

**`incident_timeline`** — id **PK** · incident_id **NN FK→ incidents** · timestamp **NN** · actor_type(20) `= user` · actor_name(255) · action_type(100) **NN** (`status_change`,`escalation`,`rca_update`,`remediation`,`incident_created`,`reassignment`) · description text **NN**.
**`incident_comments`** — id **PK** · incident_id **NN FK→ incidents** · author_id (soft→ users) · content **NN** · is_system_generated `= false` · parent_comment_id (soft, threads) · created_at/updated_at. *(Also overloaded to back responders/escalations/RCA steps via tagged content.)*
**`incident_evidence`** — id **PK** · incident_id **NN FK→ incidents** · added_by (soft→ users) · type(50) **NN** · title(255) **NN** · description · file_name · file_size_bytes · mime_type · storage_uri · hash_sha256(64) · is_sensitive `= false` · added_at.
**`incident_recommendations`** — id **PK** · incident_id **NN FK→ incidents** · content **NN** · is_completed `= false` · order_index `= 0` (the remediation checklist).

### F.8 `cases`
| Column | Type | Notes |
|---|---|---|
| id | uuid **PK** | |
| organization_id | uuid **NN FK→ organizations** | |
| case_number | varchar(50) **NN UQ** | `CASE-0001` |
| title | varchar(255) **NN** · description text | |
| status | varchar(50) `= open` | `open`/`in_progress`/`review`/`closed` (drives the workflow stepper) |
| priority | varchar(20) `= medium` | `low`/`medium`/`high`/`critical` |
| owner_id | uuid | soft→ users (assignee dropdown) |
| tags | jsonb `= []` | |
| created_at / updated_at | timestamp `= now()` · closed_at (set when status→closed) | |

### F.9 Investigations
**`investigation_notebooks`** — id **PK** · organization_id **NN FK→ organizations** · case_id (soft→ cases) · incident_id (soft→ incidents — **the incident↔investigation link**) · author_id **NN** (soft→ users) · title(255) **NN** · content text (markdown) · is_published `= false` · created_at/updated_at.
**`investigation_notes`** *(new)* — id **PK** · organization_id **NN FK→ organizations** · investigation_id **NN FK→ investigation_notebooks** · author_id (soft→ users) · author_name(255) · body text **NN** · created_at `= now()`.

### F.10 Vulnerabilities
**`vulnerabilities`** *(GLOBAL — no org_id)* — id **PK** · cve_id(50) **NN UQ** · title(255) **NN** · description · cvss_score `numeric(3,1)` · epss_score `numeric(5,4)` · severity **NN** · patch_status `= unpatched` (`unpatched`/`patch_available`/`patched`/`exception`/`not_applicable` — UI also uses `dismissed`/`in_progress`) · exploit_status `= none` (`none`/`poc`/`active`/`weaponized`/`in_the_wild`) · affected_packages jsonb `= []` · published_at · created_at.
**`asset_vulnerabilities`** — id **PK** · organization_id **NN FK→ organizations** · vulnerability_id **NN FK→ vulnerabilities** · asset_id **NN** (soft) · asset_type(20) **NN** · status `= open` · discovered_at.

### F.11 Endpoints (EDR)
**`endpoints`** — id **PK** · organization_id **NN FK→ organizations** · hostname **NN** · os(20) **NN** · ip_address(45) · is_isolated `= false` · **risk_overall / risk_malware / risk_network / risk_credential / risk_behavior** int `= 0` (multi-factor risk) · session_count `= 0` · tags jsonb `= []` · agent_version(50) · last_check_in · status `= healthy` · os_version(100).
**`endpoint_malware_indicators`** — id **PK** · endpoint_id **NN FK→ endpoints** · indicator_type(50) **NN** · indicator text **NN** · severity `= high` · description · quarantined `= false` · detected_at.

### F.12 Threat Intel
**`threat_actors`** *(GLOBAL)* — id **PK** · name(255) **NN UQ** · aliases/motivation/ttps/linked_campaigns jsonb `= []` · origin_type(50) `= unknown` · description · severity `= high` · is_active `= true` · first_seen/last_seen · created_at.
**`threat_actor_timeline`** — id **PK** · actor_id **NN FK→ threat_actors** · event_date **NN** · event_title(255) **NN** · event_desc.
**`iocs`** — id **PK** · organization_id (FK→ organizations, nullable) · threat_actor_id (FK→ threat_actors) · ioc_type(50) **NN** · value text **NN** · context · confidence_score `= 80` · severity `= high` · is_active `= true` · first_seen/last_seen · created_at.

### F.13 Cloud
**`cloud_accounts`** — id **PK** · organization_id **NN FK→** · provider(50) **NN** (`aws`/`gcp`/`azure`) · account_id(255) **NN** · account_alias · regions jsonb `= []` · sync_status `= healthy` · last_sync_at · total_assets `= 0` · risk_score `= 0` · created_at.
**`cloud_assets`** — id **PK** · cloud_account_id **NN FK→ cloud_accounts** · asset_type(100) **NN** · asset_id(255) **NN** · asset_name · region · is_public `= false` · risk_score `= 0` · configuration jsonb `= {}` · discovered_at.
**`cloud_iam_findings`** — id **PK** · cloud_account_id **NN FK→ cloud_accounts** · principal_name · finding_type(100) **NN** · risk_level(20) **NN** · description · is_resolved `= false` · detected_at.

### F.14 Network
**`network_flows`** — id **PK** · organization_id **NN FK→** · source_ip(45) **NN** · destination_ip(45) **NN** · source_port/destination_port int · protocol(20) · bytes_total `= 0` · is_malicious `= false` · threat_category · geo_country_src/geo_country_dst(2) · flow_start **NN**.
**`dns_queries`** — id **PK** · organization_id **NN FK→** · query_domain(512) **NN** · query_type(10) **NN** · entropy_score `numeric(5,3)` · is_dga `= false` · is_blocklisted `= false` · threat_category · queried_at.

### F.15 Attack Graph
**`attack_graphs`** — id **PK** · organization_id **NN FK→** · incident_id (soft) · name **NN** · description · generated_at.
**`attack_graph_nodes`** — id **PK** · graph_id **NN FK→ attack_graphs** · node_type(50) **NN** · label(255) **NN** · is_compromised/is_entry_point/is_target `= false` · risk_score `= 0` · metadata jsonb `= {}`.
**`attack_graph_edges`** — id **PK** · graph_id **NN FK→ attack_graphs** · source_node_id/target_node_id **NN** (soft→ nodes) · relationship_type(100) **NN** · mitre_technique(50) · is_active_path `= false` · confidence_score `= 80`.

### F.16 SOAR / Compliance / Copilot
**`runbooks`** — id **PK** · organization_id **NN FK→** · name **NN** · description · category · is_automated `= false` · is_enabled `= true` · execution_count `= 0` · created_at/updated_at.
**`runbook_steps`** — id **PK** · runbook_id **NN FK→ runbooks** · step_order int **NN** · name **NN** · description · action_type(50) **NN** · action_payload jsonb `= {}` · is_manual `= false`.
**`compliance_assessments`** — id **PK** · organization_id **NN FK→** · framework(50) **NN** · name **NN** · total_controls/passed_controls `= 0` · score_percent `numeric(5,2)` · status `= in_progress` · assessed_at.
**`compliance_controls`** — id **PK** · assessment_id **NN FK→ compliance_assessments** · control_id(50) **NN** · control_title(255) **NN** · description · status `= not_started` · due_date.
**`copilot_sessions`** — id **PK** · organization_id **NN FK→** · user_id **NN FK→ users** · title · workflow_type(50) · incident_id (soft) · message_count `= 0` · created_at/updated_at.
**`copilot_messages`** — id **PK** · session_id **NN FK→ copilot_sessions** · sender_role(20) **NN** (`user`/`assistant`) · content text **NN** · model_used(100) · prompt_tokens/output_tokens `= 0` · latency_ms · created_at.

### F.17 Platform & Ops
**`knowledge_articles`** — id **PK** · organization_id **NN FK→** · title **NN** · slug **NN** · content text **NN** · category · tags jsonb `= []` · is_published `= false` · created_at/updated_at.
**`reports`** — id **PK** · organization_id **NN FK→** · report_type(100) **NN** (`dashboard_summary`/`incident_summary`/`alert_summary`/…) · title **NN** · status `= pending` · parameters jsonb `= {}` · storage_uri · generated_at · created_at.
**`api_keys`** — id **PK** · organization_id **NN FK→** · name **NN** · description · key_hash(64) **NN UQ** · key_prefix(12) **NN** · scopes jsonb `= []` · rate_limit_rpm `= 1000` · is_active `= true` · last_used_at · expires_at · created_at.
**`webhooks`** — id **PK** · organization_id **NN FK→** · name **NN** · endpoint_url text **NN** · secret_key(255) **NN** · subscribed_events jsonb `= []` · is_active `= true` · failure_count `= 0` · created_at.
**`platform_integrations`** — id **PK** · organization_id **NN FK→** · provider(100) **NN** · display_name · status `= pending` · sync_enabled `= true` · last_sync_at · last_error · events_ingested `= 0` · config jsonb `= {}` · created_at.
**`platform_health_checks`** *(GLOBAL)* — id **PK** · service_name(100) **NN** · status `= healthy` · latency_ms · error_msg · checked_at.
**`identity_anomalies`** — id **PK** · organization_id **NN FK→** · user_id **NN FK→ users** · anomaly_type(100) **NN** · severity(20) **NN** · description · is_resolved `= false` · detected_at.
**`notifications`** — id **PK** · organization_id **NN FK→** · user_id (FK→ users, nullable = org-wide) · type(100) **NN** · severity `= info` · title **NN** · body · is_read `= false` · read_at · created_at.
**`audit_logs`** — id **PK** · organization_id **NN FK→** · user_id (soft) · user_email(255) · action(255) **NN** (`vulnerability.mark_patched`, `case.reassign`, `event.create_incident`, `investigation.add_note`, …) · resource_type(100) · resource_id (soft uuid) · timestamp `= now()`.

### F.18 Cardinality summary (one‑to‑many fan‑out)
```
organizations 1───* users, security_events, alerts, incidents, cases, reports, … (almost everything)
users         1───* user_sessions; 1──*(soft) incidents/cases/notebooks/notes/comments/notifications/audit
incidents     1───* incident_timeline / incident_comments / incident_evidence / incident_recommendations
incidents     1───*(soft) investigation_notebooks (via incident_id), attack_graphs, copilot_sessions
investigation_notebooks 1───* investigation_notes
vulnerabilities 1───* asset_vulnerabilities  (many orgs reference one global CVE)
threat_actors 1───* threat_actor_timeline, iocs
cloud_accounts 1───* cloud_assets, cloud_iam_findings
attack_graphs 1───* attack_graph_nodes, attack_graph_edges
runbooks 1───* runbook_steps   ·   compliance_assessments 1───* compliance_controls
copilot_sessions 1───* copilot_messages
```
