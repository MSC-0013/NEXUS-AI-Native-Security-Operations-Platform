# NEXUS — AI‑Native Security Operations Platform

**Complete engineering documentation: architecture, data flow, features, implementation, and roadmap.**

> NEXUS is an enterprise Security Operations Center (SOC) console — a single pane of glass for
> events, alerts, incidents, cases, investigations, threat hunting, vulnerabilities, cloud
> posture, identity risk, and AI copilot workflows. It is modelled on CrowdStrike Falcon,
> Microsoft Sentinel, Splunk ES, Wiz, and Elastic SIEM.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TanStack Start + TanStack Router (file-based routing), TanStack Query (server state), Zustand (client state), Tailwind v4, shadcn/ui (Radix primitives), Recharts, Framer Motion, lucide-react icons |
| **Backend** | Fastify 5 (Node, ESM, `tsx` in dev), Zod (validation), JWT auth (`jsonwebtoken`), bcryptjs |
| **Database** | PostgreSQL with **Row-Level Security (RLS)**, Drizzle ORM (`postgres-js` driver) |
| **Infra** | Redis + BullMQ (queues, currently optional/disabled), Docker Compose for local Postgres/Redis, Cloudflare (Vite plugin + Wrangler) for deploy |
| **Shared** | `@nexus/shared` (Zod schemas + enums shared between FE/BE), `@nexus/db` (Drizzle schema + client), `@nexus/ai-contracts` |
| **Build/Tooling** | Vite, npm workspaces (monorepo), TypeScript (strict), ESLint, Prettier, Bun lockfile present |

---

## 2. Repository Layout (monorepo)

```
NEXUS/
├── src/                              # FRONTEND (TanStack Start app)
│   ├── routes/                       # File-based routes. _app.* = authenticated shell pages
│   │   ├── _app.dashboard.tsx        #   /dashboard
│   │   ├── _app.events.tsx           #   /events
│   │   ├── _app.incidents.$incidentId.tsx
│   │   ├── _app.cases.tsx, _app.hunt.tsx, _app.vulnerabilities.tsx, _app.investigations.tsx …
│   ├── components/                   # Reusable UI (inspector-panel, severity-badge, metric-card, ui/*)
│   ├── lib/
│   │   ├── api-client.ts             # fetch wrapper: auth header, 401 refresh, blob + SSE helpers
│   │   ├── api-hooks.ts              # ALL React Query hooks (useEvents, useCases, useExportReport …)
│   │   ├── ui-types.ts               # UI-only view-model types (Severity, Endpoint, Vulnerability…)
│   │   ├── inspector-store.ts        # Zustand: right-side Inspector drawer target
│   │   ├── incident-store.ts         # Zustand: local incident overrides (localStorage persist)
│   │   ├── realtime.ts               # WebSocket live event stream hooks
│   │   ├── auth-store.ts             # Zustand: current user + tokens
│   │   └── rbac.ts                   # Role → permission mapping (client side)
│   └── ...
│
├── apps/api/                         # BACKEND (Fastify)
│   └── src/
│       ├── app.ts                    # Fastify bootstrap: plugins, error handler, /health, /ready
│       ├── index.ts                  # Server entry
│       ├── config/                   # env loader, dotenv
│       ├── middleware/authenticate.ts# JWT verify + requirePermission
│       ├── lib/
│       │   ├── tenant.ts             # withTenant() — sets RLS org context
│       │   ├── route-helpers.ts      # authGuard(), getUser()
│       │   └── errors.ts             # AppError, NotFoundError, ValidationError
│       ├── plugins/audit-log.ts      # cross-cutting audit hook
│       └── modules/                  # ONE FOLDER PER DOMAIN
│           ├── register.ts           # registers every module's routes
│           ├── events/   (events.routes.ts + events.service.ts)
│           ├── incidents/  alerts/  cases/  investigations/  hunt/
│           ├── vulnerabilities/  dashboard/  reports/  audit/  …
│
├── packages/
│   ├── db/src/schema.ts              # Drizzle table definitions (single source of truth for tables)
│   ├── db/src/index.ts               # createDb() + setTenantContext()
│   └── shared/src/                   # Zod schemas (schemas/index.ts) + enums (enums/index.ts) → DTOs & types
│
├── database/migrations/             # Sequential SQL migrations: NNN_name.sql (+ RLS policies + seeds)
└── apps/api/src/scripts/migrate.ts  # Migration runner (tracks applied files in _migrations table)
```

---

## 3. High-Level Architecture

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │  BROWSER (React 19 / TanStack)                                        │
 │                                                                      │
 │  Route component ── React Query hook (api-hooks.ts) ── api-client ───┼──┐
 │       │                    ▲                                         │  │ HTTPS /v1/*
 │       │ Zustand stores     │ cache + invalidation                   │  │ (+ WS /v1/ws/events)
 │       ▼ (inspector/auth)   │                                        │  │
 │  Inspector drawer, charts, tables                                    │  │
 └──────────────────────────────────────────────────────────────────────┘  │
                                                                            ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  FASTIFY API (apps/api)                                                   │
 │                                                                          │
 │  Route (Zod-validated)  ─►  authenticate()  ─►  requirePermission()      │
 │        │                                                                 │
 │        ▼                                                                 │
 │  Service class  ──►  withTenant(client, orgId, fn)                       │
 │        │                  │ sets app.current_org GUC                     │
 │        ▼                  ▼                                              │
 │  Drizzle ORM query  ──►  PostgreSQL (RLS enforces org isolation)         │
 │        │                                                                 │
 │        └─►  audit_logs insert (who/what/when) on mutations               │
 └──────────────────────────────────────────────────────────────────────────┘
```

**The golden rule of every feature: Frontend → React Query hook → `/v1/*` API → Service → Drizzle → Postgres → response → cache invalidation → UI refresh.**

---

## 4. Request Lifecycle (the canonical data flow)

1. **Component** calls a hook from `src/lib/api-hooks.ts`, e.g. `useCases()` or a mutation like `useUpdateCase()`.
2. **React Query** runs the `queryFn`/`mutationFn`, which calls `apiFetch()` in `src/lib/api-client.ts`.
3. **`apiFetch`** attaches `Authorization: Bearer <accessToken>` (read from `localStorage["nexus.tokens"]`), and on `401` it transparently calls `/v1/auth/refresh` once and retries.
4. **Fastify route** (`*.routes.ts`) runs `preHandler` = `authenticate(env)` (verifies JWT, attaches `request.user = { sub, orgId, email, name, permissions }`) then `requirePermission(...)`.
5. The route parses the body/query with a **Zod schema**, then calls a **service** method.
6. The **service** wraps DB work in `withTenant(client, orgId, fn)` which runs `SELECT set_config('app.current_org', orgId, …)`. Postgres **RLS policies** (`USING (organization_id::text = current_setting('app.current_org', true))`) then filter every row to the caller's org.
7. **Drizzle** executes the typed query; mutations also write an **`audit_logs`** row.
8. JSON returns up the stack. On success, the **mutation's `onSuccess` invalidates** the relevant query keys, so React Query refetches and the **UI updates automatically**.

---

## 5. Authentication & Authorization

- **JWT** access + refresh tokens. `authenticate(env)` verifies the access token and decodes `JwtPayload = { sub, orgId, email, name, permissions[] }` onto `request.user`.
- **`requirePermission("act:incidents")`** (and `authGuard(env, ...perms)` helper) gate each route. Permissions are derived from the user's **role** (`super_admin`, `security_admin`, `soc_analyst`, `threat_hunter`, `incident_responder`, `compliance_officer`, `viewer`).
- **Client-side RBAC** mirror lives in `src/lib/rbac.ts` for showing/hiding UI; the server is the source of truth.
- Token storage + refresh is fully handled in `api-client.ts`; components never touch tokens.

---

## 6. Multi-Tenancy (Row-Level Security)

This is the most important backend invariant:

- Every tenant-scoped table has `organization_id` and an RLS policy keyed on the `app.current_org` GUC.
- `withTenant(client, orgId, fn)` (`apps/api/src/lib/tenant.ts`) sets that GUC before running the query.
- Services therefore **never trust a client-supplied org**; they use `request.user.orgId` only.
- New tenant tables MUST: add `organization_id` FK, `ENABLE ROW LEVEL SECURITY`, and a `..._org_policy` (see `database/migrations/007_alert_suppression_rules.sql` and the new `009_investigation_notes.sql` as templates).

> ⚠️ **Known risk (see Roadmap):** `set_config(..., false)` is session-scoped, while the `postgres-js` pool (`max: 20`) may hand the follow-up Drizzle query a *different* pooled connection. Under concurrency this can weaken isolation. The robust fix is a reserved/pinned connection per request or `SET LOCAL` inside an explicit transaction.

---

## 7. Database Schema (key tables)

Defined in `packages/db/src/schema.ts` (Drizzle) and created by `database/migrations/*.sql`.

| Table | Purpose |
|-------|---------|
| `organizations`, `users`, `roles`, `user_sessions` | Tenancy, identity, RBAC |
| `security_events` | Raw SIEM telemetry (the hunt + events source of truth) |
| `alert_rules`, `alerts`, `alert_suppression_rules` | Detection rules, fired alerts, suppression |
| `incidents`, `incident_timeline`, `incident_comments`, `incident_evidence`, `incident_recommendations` | Incident response |
| `cases` | Case management (owner, status, priority) |
| `investigation_notebooks`, **`investigation_notes`** *(new)* | Investigation workspace + collaborative notes |
| `vulnerabilities`, `asset_vulnerabilities` | CVE catalogue + per-asset linkage/status |
| `endpoints`, `threat_actors`, `iocs`, `cloud_*`, `network_flows`, `dns_queries` | Detection surfaces |
| `knowledge_articles`, `runbooks`, `reports`, `compliance_*` | Platform modules |
| `notifications`, `audit_logs`, `policies`, `attack_graphs`, `api_keys`, `webhooks`, `platform_integrations` | Cross-cutting |

---

## 8. Backend Module Pattern

Every domain follows the same two-file pattern:

- **`X.routes.ts`** — declares HTTP endpoints, runs `authGuard`/`requirePermission`, validates with Zod, calls the service, shapes the reply.
- **`X.service.ts`** — a class constructed with `(db, pgClient)`; every method runs inside `withTenant(...)`, performs Drizzle queries, writes audit logs on mutations, and returns plain DTOs (camelCase, ISO date strings).

To add a feature: extend the service with a method → expose it in routes → add a hook in `api-hooks.ts` → call it from the component → invalidate the right query keys.

---

## 9. Frontend Architecture

- **Routing:** file-based. `_app.*` files render inside the authenticated app shell (sidebar, top bar, command palette, Inspector drawer). `$param` files are dynamic (e.g. `_app.incidents.$incidentId.tsx`).
- **Server state:** **React Query** only. Hooks live in `api-hooks.ts`. Query keys are arrays (`["cases"]`, `["incident", id]`); mutations invalidate keys to drive auto-refresh.
- **Client state:** **Zustand** stores — `auth-store` (user/tokens), `inspector-store` (drawer target), `incident-store` (local overrides w/ localStorage persistence).
- **Inspector drawer** (`components/inspector-panel.tsx`): a single right-side panel that renders 6 entity types (event, incident, alert, endpoint, vulnerability, actor). It reads its target from `inspector-store` and now contains live action buttons (Suppress similar / Create incident for events).
- **Types:** API DTOs come from `@nexus/shared` (`SecurityEventDto`, `IncidentDto`, `AlertDto`, …). Richer presentational shapes the API doesn't supply (e.g. endpoint risk breakdown, actor timelines) live in `src/lib/ui-types.ts`. `Severity` is an alias of the shared `SeverityLevel` enum.

---

## 10. Realtime

- `src/lib/realtime.ts` opens a **WebSocket** to `/v1/ws/events` (token in query string) and streams `SecurityEventDto`s into the dashboard/events live feeds, with connection-state tracking and a stats hook. Falls back to "reconnecting" when unauthenticated.

---

## 11. Feature Walkthrough (what each page does and how it's wired)

| Page | Reads | Writes (mutations) |
|------|-------|--------------------|
| **/dashboard** | `useDashboardStats`, `useIncidents`, live WS events | **Export** → `useExportReport` (creates a report + downloads CSV from live DB); **Ask Copilot** → navigate to `/copilot` |
| **/events** | `useEvents` + live WS; Inspector for detail | **Suppress similar** → `useSuppressSimilarEvents`; **Create incident** → `useCreateIncidentFromEvent`; **Open investigation** → `useCreateInvestigationFromEvent` |
| **/incidents/$id** | `useIncident`, timeline, comments, evidence, SLA, responders | status change, comments, escalate, RCA, postmortem, **Open Full Investigation** → `useOpenIncidentInvestigation` (get-or-create linked notebook + auto status→investigating) |
| **/cases** | `useCases`, `useOrgUsers` | **Assignee** → `useUpdateCase({ownerId})`; **Workflow steps** → `useUpdateCase({status})` (status↔step mapping) |
| **/vulnerabilities** | `useVulnerabilities` | **Mark Patched / Dismiss / Reopen** → `usePatchVulnerability` (+ audit log) |
| **/investigations** | `useInvestigations`, `useInvestigationNotes` | **Save** → `useUpdateInvestigation`; **New Note** → `useAddInvestigationNote` (DB-backed `investigation_notes`) |
| **/hunt** | `useHuntQueries`, `useHuntAnomalies` | **Run** → `useHuntResults` (real `security_events` query w/ filters, total count, pagination) |

Other shipped modules: threat intelligence, endpoints, identity, cloud security, network, attack graph, detection rules, copilot, reports, developer (API keys/webhooks), knowledge base, compliance, runbooks, platform health, notifications, audit.

---

## 12. What Was Implemented / Fixed in This Session

**Foundation (build was broken — mid-migration):**
- The repo had deleted `src/lib/mock/*` but ~20 files still referenced the removed `Severity`/`SecurityEvent` types. Restored compilation by:
  - Creating `src/lib/ui-types.ts` (pure view-model types, **no mock data**).
  - Aliasing `SeverityLevel as Severity` from `@nexus/shared` across all route files.
  - Re-typing the Inspector to consume real DTOs (`SecurityEventDto`/`IncidentDto`/`AlertDto`) + `ui-types`.
  - Result: **frontend `tsc` 0 errors, API `tsc` 0 errors** (also fixed pre-existing API bugs in `ai.routes.ts` `riskScore→riskOverall`, `alerts.source`, and `reports.service` `createdAt`/`source`).

**Per-task, all following the full FE→API→DB→FE loop with validation, loading/disabled states, audit logging, and auto-refresh:**

1. **Events** — added `POST /v1/events/:id/suppress-similar` (persists an `alert_suppression_rules` row + counts matches) and `POST /v1/events/:id/incident` (creates incident + timeline + recommendations). Wired the dead Inspector buttons with loading + success/error notices; navigates to the new incident.
2. **Dashboard** — Export now creates a `dashboard_summary` report and downloads a real CSV (`useExportReport` → `POST /v1/reports` → `GET /v1/reports/:id/download`); added a `dashboard_summary` branch in `reports.service` that aggregates live incident/alert/vuln counts. Ask Copilot navigates to `/copilot`.
3. **Incident details** — added `POST /v1/incidents/:id/investigation` → `InvestigationsService.getOrCreateForIncident` (stable incident↔investigation link, audit log) and an **Open Full Investigation** button that also auto-advances an `open` incident to `investigating`.
4. **Cases** — added `ownerId` + audit logging to the case update path; replaced the hardcoded `ASSIGNEES` list with **real org users** (`useOrgUsers`) and a controlled, persisted assignee dropdown; workflow steps now derive from and drive the real DB `status` via a status↔step mapping.
5. **Vulnerabilities** — `updateStatus` now runs in tenant context and writes a typed **audit log** (`mark_patched`/`dismiss`/`status_change`); hook invalidates `vulnerabilities` + `dashboard` + `audit`.
6. **Investigations** — added a new **`investigation_notes`** table (migration `009`, Drizzle schema, RLS), service `listNotes`/`addNote`, routes `GET/POST /v1/investigations/:id/notes`, hooks, and wired the previously-dead "Add a note" box + Save.
7. **Threat hunting** — rewrote `executeQuery` to run against **real `security_events`** with `field:value` filter parsing (`severity:`, `type:`, `host:`, `ip:`, `src:`, `dst:`, …) + free-text, returning `{ items, total }`; route supports `limit`/`offset`; UI shows real match counts and **pagination**.

---

## 13. How to Run Locally

```bash
# 1. Install deps (monorepo)
npm install

# 2. Start Postgres + Redis
npm run db:up                 # docker compose up -d postgres redis

# 3. Apply migrations (includes the new 009_investigation_notes.sql)
npm run db:migrate

# 4. Run API + frontend together
npm run dev:all               # API on :3001, Vite app on :3000 (configurable)

# Individually:
npm run dev                   # frontend
npm run dev:api               # backend (tsx watch)
```

Env: API reads `DATABASE_URL` (default `postgresql://nexus:nexus@localhost:5432/nexus`), JWT secrets, `CORS_ORIGIN`, rate limits. Frontend reads `VITE_API_URL` (default `http://localhost:3001`) and `VITE_WS_URL`.

> After pulling these changes, **run `npm run db:migrate`** so the `investigation_notes` table exists, then restart the API.

---

## 14. Next Updates Required (Roadmap)

**Correctness / hardening**
1. **RLS connection pinning** — reserve a single `postgres` connection per request (or use `SET LOCAL` inside a transaction) so the tenant GUC and the Drizzle query always share one connection. *(Highest priority — current setup can leak across tenants under load.)*
2. **Centralize audit logging** — move ad-hoc `auditLogs` inserts into the `auditLogPlugin`/an `onResponse` hook or a service decorator so every mutation is logged consistently.
3. **Vulnerability status is global** — `vulnerabilities.patch_status` is shared across orgs. Per-tenant status belongs on `asset_vulnerabilities.status`; migrate the Mark-Patched/Dismiss writes there.

**Feature completeness**
4. **Remove remaining demo fallbacks** — `/cases` and `/investigations` still fall back to hardcoded arrays when the API returns zero rows, and their rich detail panels (evidence, activity feed, endpoints, AI summary) are presentational only. Back these with real tables (`case_evidence`, `case_activity`, `investigation_evidence`) + endpoints, then delete the mock arrays.
5. **Hunt saved queries & anomalies** — `hunt.service` still serves static `QUERIES`/`ANOMALIES`. Add a `hunt_queries` table (save/run/schedule) and compute anomalies from real telemetry; persist the “Save” button on `/hunt`.
6. **Copilot real insights** — ensure `/copilot` aggregates live incidents/alerts/vulns/cases (wire to an LLM via `@nexus/ai-contracts`); pass dashboard context when navigating from "Ask Copilot".
7. **Reports** — mark a report `generated` after CSV download, add PDF/JSON formats, and async generation via BullMQ.
8. **Realtime fan-out** — broadcast not just events but incident/alert/case status changes over WS so multiple analysts see live updates without refetching.

**Platform**
9. **Tests** — no automated tests yet. Add Vitest unit tests for services (RLS, audit, mappers) and Playwright E2E for the 7 workflows.
10. **CI** — wire `tsc --noEmit` (both projects) + lint + tests into CI to prevent regressions like the mock-migration breakage.
11. **Observability** — structured request logging is present; add metrics (Prometheus) and error tracking (Sentry).
12. **Schema drift guard** — `packages/db/src/schema.ts` and `database/migrations/*.sql` are maintained by hand; adopt `drizzle-kit` generate/check to keep them in lockstep.

---

## 15. Conventions (so new work stays consistent)

- **DTOs**: camelCase fields, ISO 8601 date strings, nullable fields explicit.
- **Query keys**: stable arrays; list keys (`["cases"]`) vs detail keys (`["incident", id]`); always invalidate after mutations.
- **Validation**: every route body/query parsed with Zod; shared shapes go in `@nexus/shared`.
- **Tenant**: services only ever use `request.user.orgId`; never an org from the body.
- **Audit**: every state-changing service method inserts an `audit_logs` row with `action`, `resourceType`, `resourceId`, actor.
- **UI affordances**: mutations expose `isPending` → buttons show loading + `disabled`; errors surface inline (or `alert` as a fallback).

---

## 16. Status & Lifecycle State Machines

These enums drive badges, filters, and workflow steppers across the UI. They live in `packages/shared/src/enums/index.ts` (validated) and the DB `varchar` columns.

**Severity (everywhere):** `critical → high → medium → low → info → healthy`

**Incident status** (`incidents.status`):
```
open ──► investigating ──► contained ──► eradicated ──► recovered ──► closed
  │            ▲
  └─ "Open Full Investigation" auto-advances open → investigating
```

**Alert status** (`alerts.status`):
```
new ──► triaging ──► acknowledged
   └──► escalated ──► (creates incident)
   └──► suppressed   (creates alert_suppression_rules row)
   └──► resolved
```

**Case status** (`cases.status`) ↔ **workflow step** (UI):
```
open → triage   |  in_progress → analyze/contain  |  review → remediate  |  closed → close
(clicking a workflow step PATCHes the mapped status; closed sets closed_at)
```

**Vulnerability patch status** (`vulnerabilities.patch_status`):
```
unpatched ──► patch_available ──► patched
unpatched ──► dismissed (exception)   |   patched/dismissed ──► (Reopen) ──► unpatched
```
**Exploit status:** `none → poc → active → weaponized → in_the_wild`.

**Investigation:** notebook `is_published` false→true; collaborative notes are append-only.

---

## 17. Authentication — Full Flow

**Login** (`POST /v1/auth/login`):
1. Look up user by email; verify password via `bcrypt.compare` **or** a demo-password fallback map in `auth.service.ts`.
2. Issue **access JWT** (`JWT_ACCESS_EXPIRY`, default **15m**) signed with `JWT_SECRET`, payload `{ sub, orgId, email, name, permissions }`.
3. Issue **refresh JWT** (`JWT_REFRESH_EXPIRY`, default **7d**) signed with `JWT_REFRESH_SECRET`; a `user_sessions` row records it.
4. Frontend stores both in `localStorage["nexus.tokens"]`.

**On every request:** `apiFetch` sends `Authorization: Bearer <access>`. On `401`, it calls `/v1/auth/refresh` once, swaps the access token, and retries — transparent to components.

**Demo logins (seeded):** organization *Acme Federal*, password **`NexusDemo2024!`** for users like `admin@acme.federal`, `amelia.lee@acme.federal`, `h.tanaka@acme.federal`, `j.okafor@acme.federal`, `marco.cruz@acme.federal`, `n.patel@acme.federal`, `s.ivanov@acme.federal`.

**Permissions:** routes call `requirePermission("view:x" | "act:x")`; the permission list is embedded in the JWT (derived from the user's role's `permissions[]`). `src/lib/rbac.ts` mirrors this client-side for show/hide only — the server is authoritative.

---

## 18. Validation & Error Model

- **Validation:** every route parses `request.body`/`request.query` with a **Zod** schema. Shared shapes live in `@nexus/shared`; route-local shapes are declared inline.
- **Error handler** (`apps/api/src/app.ts`) maps:
  - `ZodError` → `400 { error:"Validation failed", code:"VALIDATION_ERROR", details }`
  - `AppError`/`NotFoundError`/`ValidationError` → their `statusCode` + `code`
  - anything else → `500 { error:"Internal server error", code:"INTERNAL_ERROR" }` (logged)
- **Client side:** `apiFetch` throws a typed `ApiError(message, status, code)`; React Query exposes it via `isError`/`error`, and mutations surface it in `onError` (inline notice or `alert`).

---

## 19. Realtime — WebSocket Protocol

Endpoint: `GET /v1/ws/events?token=<accessToken>` (`apps/api/src/modules/realtime/websocket.routes.ts`).

1. Server reads `token` from the query string and verifies it (`verifyAccessToken`); closes with code **4001** if missing/invalid.
2. On connect it sends `{"type":"connected","data":{"orgId"}}`.
3. Every **3 seconds** it polls `EventsService.list(orgId, { since, limit:10 })` and emits each new row as `{"type":"event","data": SecurityEventDto }`, advancing the `since` cursor.
4. `src/lib/realtime.ts` consumes these into the dashboard/events live feeds and tracks connection state; it falls back to "reconnecting" when unauthenticated.

> This is **poll-over-WebSocket** today (simple, reliable). Roadmap item #8 is true push for incident/alert/case changes.

---

## 20. Configuration (environment variables)

API (`apps/api/src/config/env.ts`, Zod-validated with defaults):

| Var | Default | Purpose |
|---|---|---|
| `NODE_ENV` | development | runtime mode |
| `PORT` / `HOST` | 3001 / 0.0.0.0 | bind |
| `DATABASE_URL` | postgres://nexus:nexus@localhost:5432/nexus | Postgres |
| `REDIS_URL` | redis://localhost:6379 | queues (optional) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | dev values (**change in prod**) | token signing |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | 15m / 7d | token lifetimes |
| `CORS_ORIGIN` | http://localhost:5173 | allowed origins (comma-sep) |
| `RATE_LIMIT_RPM_DEFAULT` | 300 | per-IP requests/min |
| `LLM_PROVIDER` / `OPENAI_API_KEY` / `CHAT_MODEL` / `EMBEDDING_MODEL` | none / – / gpt-4o-mini / text-embedding-3-small | Copilot/AI |
| `S3_BUCKET` / `S3_REGION` | – / us-east-1 | report/evidence storage |
| `WEBHOOK_SIGNING_SECRET` | – | outbound webhook HMAC |

Frontend: `VITE_API_URL` (default `http://localhost:3001`), `VITE_WS_URL` (defaults to API URL with `http→ws`).

**Security middleware** (`app.ts`): `@fastify/helmet` (headers), `@fastify/cors` (credentialed, origin allow-list), `@fastify/rate-limit` (per-IP), 1 MB body limit, per-request `x-request-id`.

---

## 21. Conventions (recap)

- **DTOs**: camelCase, ISO dates, explicit nullability; defined as Zod in `@nexus/shared`.
- **Query keys**: list (`["cases"]`) vs detail (`["incident", id]`); always invalidate after mutations.
- **Tenant**: services use `request.user.orgId` only; never an org from the body.
- **Audit**: every state-changing service method writes an `audit_logs` row.
- **New tenant table checklist**: add `organization_id` FK → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY ..._org_policy USING (organization_id::text = current_setting('app.current_org', true))` → add to `schema.ts` → new `NNN_*.sql` migration.

---
*Generated as part of the SOC workflow remediation pass. Both `tsc` projects compile with 0 errors. See [ARCHITECTURE-DEEP-DIVE.md](ARCHITECTURE-DEEP-DIVE.md) Part F for the column-level data dictionary.*
