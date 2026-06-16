# NEXUS — AI-Native Security Operations Platform

Enterprise-grade Security Operations Center (SOC) UI inspired by CrowdStrike Falcon,
Microsoft Sentinel, Datadog Security, Splunk ES, Wiz, and Elastic SIEM.

> Built on **TanStack Start + React 19 + Tailwind v4 + shadcn/ui** with a Fastify/Postgres API.
> Core SOC pages now use backend modules, tenant-scoped database reads, and action mutations.

## Demo

The dev preview lands on `/landing` — the enterprise landing page. From there,
sign in to reach the full SOC console. Pick any role (default: **Security Admin**).

Try:
- **/landing** — Enterprise landing page with module overview and quick access
- **/profile** — User profile and security settings
- **/notifications** — Notification center for alerts and system messages
- **/investigations** — Investigation notebooks workspace
- **/cases** — Case management system
- **/reports** — Reporting and analytics
- **/developer** — API key and webhook management platform
- **/status** — System status page
- **/onboarding** — Guided onboarding flow for new users
- **/knowledge** — Knowledge base and runbooks
- **/platform-health** — Platform health monitoring dashboard
- **Cmd+K / Ctrl+K** anywhere — global command palette with search, saved queries, recent items, and filter hints
- Click any event row in the live stream or events table — right-side **Inspector** (now supports 6 entity types: event, incident, alert, endpoint, vulnerability, actor)
- Click an incident — opens the full investigation page with timeline + RCA
- **AI Copilot** — 7 workflow types including incident explanation, remediation plans, and investigation assistance
- **Attack Graph** — animated paths, lateral movement visualization, blast radius, and dependency overlays

## Phase 1 — shipped

Foundation + Dashboard + Events + Incidents.

- Dark enterprise design system (Inter + JetBrains Mono, severity tokens, grid bg)
- App shell: sidebar, top bar, time-range chip, stream throughput, command palette
- Mock auth (Zustand + persist) with 7-role RBAC
- Realtime event stream simulator + heartbeat
- Operational `/dashboard` — 8 KPI cards w/ sparklines, threat trend, detections by type, live attack stream, incident feed
- `/events` — SIEM explorer with query bar, severity facets, stream toggle, dense table
- `/incidents` — triage table with status facets, severity counts, deep links
- `/incidents/$incidentId` — investigation view with timeline, RCA, MITRE ATT&CK chips, recommended actions, comments
- Inspector drawer (Framer Motion) for events + incidents — no page nav required
- Marketing-style auth screen with role picker

## Phase 2 — shipped

Detection surfaces + AI + investigation tools + platform modules.

- `/threat-intelligence` — actor profiles, ransomware tracking, IOC feeds, campaign timelines, exploit tracking
- `/endpoints` — process trees, device telemetry, malware indicators, isolation actions, session tracking, behavioral analytics
- `/identity` — risky users, impossible-travel map, MFA anomalies
- `/cloud-security` — exposed assets, IAM analysis, storage exposure, risk scoring, region mapping, compliance overlays
- `/vulnerabilities` — CVE table with CVSS/EPSS, patch status
- `/network` — flow analytics, geo attack map, DNS analytics
- `/alerts` — suppressions, escalation chains, mute/snooze, routing rules, notification channels, deduplication, AI prioritization
- `/attack-graph` — animated paths, lateral movement, compromised nodes, blast radius, dependency overlays
- `/copilot` — AI chat with 7 workflow types (incident explanation, remediation plans, anomaly clustering, threat prioritization, attack chain analysis, query generation, investigation assistant)
- `/landing` — enterprise landing page
- `/profile` — user profile and security settings
- `/notifications` — notification center
- `/investigations` — investigation notebooks workspace
- `/cases` — case management system
- `/reports` — reporting system
- `/developer` — API key and webhook platform
- `/status` — system status page
- `/onboarding` — guided onboarding flow
- `/knowledge` — knowledge base and runbooks
- `/platform-health` — platform health monitoring

Infrastructure upgrades:
- Inspector panel expanded to 6 entity types (event, incident, alert, endpoint, vulnerability, actor)
- Command palette with global search, saved queries, recent items, filter hints
- Realtime system: connection state tracking, stream stats, stale data warnings
- UX utilities: PageSkeleton, EmptyState, ErrorBoundary, LoadingCard, LoadingTable, StaleDataWarning, ConfirmDialog, PageHeader
- Sidebar navigation expanded with Platform group (Reports, Developer, System Status, Knowledge Base, Platform Health)
- Incidents upgraded with evidence, responders, SLA timer, severity escalation, communication, root cause workflow, remediation tracking, postmortem generation

## Backend-backed routes and actions

The following routes are integrated with Fastify API modules and database-backed queries or mutations:

| Area | Frontend route | API integration |
|---|---|---|
| Events | `/events` | `/v1/events`, `/v1/events/:id/investigation` |
| Alerts | `/alerts` | `/v1/alerts`, `/v1/alerts/:id/suppress-similar`, `/v1/alerts/:id/incident` |
| Incidents | `/incidents`, `/incidents/:id` | status, comments, evidence, SLA, responders, escalations, remediations |
| Cloud security | `/cloud-security` | accounts, resources, IAM findings, storage exposure, compliance overlays |
| Hunt | `/hunt` | saved hunts, anomalies, and query result execution |
| Reports | `/reports` | report creation/listing plus client export as PDF, CSV, or JSON |
| Detection rules | `/detection-rules` | rule listing, backend enable/disable, audit detail modal |
| Automation | `/automation` | runbook listing and workflow assignment |
| Developer | `/developer` | API key generation/revocation and webhook registration |
| Knowledge | `/knowledge` | article listing, detail view, and article creation |
| Platform status | `/status`, `/platform-health` | platform health checks from database |

See [ROADMAP.md](./ROADMAP.md) for what's next.

## Stack

| Concern | Library |
|---|---|
| Framework | TanStack Start (Vite, file-based routing, SSR-ready) |
| UI | shadcn/ui + Tailwind v4 |
| State | Zustand (auth, inspector) + TanStack Query (server cache, ready for backend) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Motion | Framer Motion |
| Command palette | cmdk |
| Icons | lucide-react |
| Mock data | @faker-js/faker (seeded for determinism) |

## File layout

```
src/
  components/
    app-sidebar.tsx       — grouped nav (Operate / Detect / Investigate / Govern / Platform)
    app-topbar.tsx        — search, Cmd+K, time range, stream rate, user pill
    command-palette.tsx   — cmdk palette w/ navigation + actions + global search + saved queries + recent items
    inspector-panel.tsx   — right drawer for events, incidents, alerts, endpoints, vulnerabilities, actors
    metric-card.tsx       — KPI tile with sparkline
    module-preview.tsx    — module preview cards for landing page
    severity-badge.tsx    — semantic severity chip
    ux-utilities.tsx      — PageSkeleton, EmptyState, ErrorBoundary, LoadingCard, LoadingTable,
                           StaleDataWarning, ConfirmDialog, PageHeader
    ui/                   — shadcn/ui primitives (button, card, table, dialog, tabs, etc.)
  hooks/
    use-mobile.tsx        — responsive breakpoint hook
  lib/
    auth-store.ts         — Zustand mock session
    incident-store.ts     — incident state management
    inspector-store.ts    — drawer target
    rbac.ts               — roles + permissions + can()
    realtime.ts           — useLiveEvents + useHeartbeat + useConnectionState + useStreamStats
    error-page.ts         — error page component
    error-capture.ts      — error capture utility
    utils.ts              — cn() and shared helpers
    mock/
      types.ts            — SecurityEvent, Incident, Alert, Endpoint, Vulnerability, ThreatActor, etc
      generators.ts       — faker generators + seeded singletons
  routes/
    __root.tsx            — shell + fonts + meta
    index.tsx             — redirect → /landing
    landing.tsx           — enterprise landing page
    login.tsx             — mock auth
    _app.tsx              — gated layout (sidebar + topbar + inspector)
    _app.dashboard.tsx    — SOC overview
    _app.events.tsx       — SIEM explorer
    _app.incidents.tsx    — incident triage
    _app.incidents.$incidentId.tsx — investigation view
    _app.alerts.tsx       — alert center with suppress/escalate/mute/snooze
    _app.notifications.tsx — notification center
    _app.cases.tsx        — case management
    _app.investigations.tsx — investigation notebooks
    _app.reports.tsx      — reporting system
    _app.copilot.tsx      — AI copilot chat surface
    _app.attack-graph.tsx — force-directed attack graph
    _app.threat-intelligence.tsx — actor profiles, IOC feeds, campaigns
    _app.endpoints.tsx    — endpoint inventory and actions
    _app.identity.tsx     — identity risk and anomalies
    _app.cloud-security.tsx — cloud posture and exposure
    _app.vulnerabilities.tsx — CVE tracker
    _app.network.tsx      — network flow analytics
    _app.compliance.tsx   — compliance scoring
    _app.audit.tsx        — admin action log
    _app.integrations.tsx — integration hub
    _app.organizations.tsx — workspace and RBAC management
    _app.settings.tsx     — workspace settings
    _app.profile.tsx      — user profile and security settings
    _app.developer.tsx    — API keys and webhooks
    _app.status.tsx       — system status page
    _app.onboarding.tsx   — guided onboarding flow
    _app.knowledge.tsx    — knowledge base and runbooks
    _app.platform-health.tsx — platform health monitoring
  styles.css              — design tokens (oklch), severity colors, utilities
```

## Conventions

- **No hardcoded colors in components** — use semantic tokens (`bg-critical/15`, `text-healthy`, etc.).
- **No `react-router-dom`** — TanStack Router only.
- **No `src/pages/`** — pages live in `src/routes/` (flat dot naming).
- **Mock data is seeded** (`faker.seed(42)`) so demos stay stable per session.


| Role               | Email                                                     | Password                                                     |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
| super_admin        | [admin@acme.federal](mailto:admin@acme.federal)           | NexusSuperAdmin#2024                                        |
| security_admin     | [amelia.lee@acme.federal](mailto:amelia.lee@acme.federal) | NexusDemo2024!                                              |
| soc_analyst        | [j.okafor@acme.federal](mailto:j.okafor@acme.federal)     | SOCAnalyst@2024                                             |
| threat_hunter      | [h.tanaka@acme.federal](mailto:h.tanaka@acme.federal)     | ThreatHunt#2024                                             |
| incident_responder | [marco.cruz@acme.federal](mailto:marco.cruz@acme.federal) | Respond2024!                                                |
| compliance_officer | [n.patel@acme.federal](mailto:n.patel@acme.federal)       | Compliance#24                                               |
| viewer             | [s.ivanov@acme.federal](mailto:s.ivanov@acme.federal)     | ViewOnly2024                                                |
