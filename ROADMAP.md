# NEXUS Roadmap

## Phase 1 — Foundation (shipped)
Design system, app shell, mock auth + RBAC, realtime simulator, Dashboard,
Events SIEM explorer, Incidents list + detail, Inspector drawer.

## Phase 2 — Detection surfaces (shipped)
- [x] `/threat-intelligence` — actor profiles, ransomware tracking, IOC feeds, campaign timelines, exploit tracking
- [x] `/endpoints` — process trees, device telemetry, malware indicators, isolation actions, session tracking, behavioral analytics
- [x] `/identity` — risky users, impossible-travel map, MFA anomalies
- [x] `/cloud-security` — exposed assets, IAM analysis, storage exposure, risk scoring, region mapping, compliance overlays
- [x] `/vulnerabilities` — CVE table with CVSS/EPSS, patch status
- [x] `/network` — flow analytics, geo attack map, DNS analytics
- [x] `/alerts` — suppressions, escalation chains, mute/snooze, routing rules, notification channels, deduplication, AI prioritization
- [x] `/attack-graph` — animated paths, lateral movement, compromised nodes, blast radius, dependency overlays
- [x] `/copilot` — AI chat with 7 workflow types (incident explanation, remediation plans, anomaly clustering, threat prioritization, attack chain analysis, query generation, investigation assistant)

## Phase 2b — Platform modules (shipped)
- [x] `/landing` — enterprise landing page with module overview and quick access
- [x] `/profile` — user profile and security settings
- [x] `/notifications` — notification center for alerts and system messages
- [x] `/investigations` — investigation notebooks workspace
- [x] `/cases` — case management system
- [x] `/reports` — reporting and analytics system
- [x] `/developer` — API key and webhook management platform
- [x] `/status` — system status page
- [x] `/onboarding` — guided onboarding flow for new users
- [x] `/knowledge` — knowledge base and runbooks
- [x] `/platform-health` — platform health monitoring dashboard

Infrastructure shipped in Phase 2:
- [x] Inspector panel expanded to 6 entity types (event, incident, alert, endpoint, vulnerability, actor)
- [x] Command palette with global search, saved queries, recent items, filter hints
- [x] Realtime system: connection state tracking, stream stats, stale data warnings
- [x] UX utilities: PageSkeleton, EmptyState, ErrorBoundary, LoadingCard, LoadingTable, StaleDataWarning, ConfirmDialog, PageHeader
- [x] Sidebar navigation expanded with Platform group (Reports, Developer, System Status, Knowledge Base, Platform Health)
- [x] Incidents upgraded with evidence, responders, SLA timer, severity escalation, communication, root cause workflow, remediation tracking, postmortem generation

## Phase 3 — Governance
- [ ] `/compliance` — SOC2 / ISO27001 / HIPAA / GDPR / PCI scoring + evidence
- [ ] `/audit` — admin action log (route exists, needs full implementation)
- [ ] `/integrations` — Slack/Teams/GitHub/AWS/etc. integration hub (route exists, needs full implementation)
- [ ] `/organizations` — workspace switcher, invites, RBAC management (route exists, needs full implementation)
- [ ] `/settings` — API keys, webhooks, retention, notification preferences (route exists, needs full implementation)
- [ ] Role-based view customization and dashboard layout persistence
- [ ] Audit trail with export and retention policies

## Phase 4 — Advanced investigation
- [ ] Investigation notebooks with collaborative editing
- [ ] Case timeline linking across incidents, alerts, and evidence
- [ ] Automated postmortem generation from incident data
- [ ] Report builder with scheduled delivery (email, Slack, PDF)
- [ ] Saved and shared investigation templates
- [ ] Cross-case correlation and deduplication

## Phase 5 — Backend
- [ ] Real auth via Lovable Cloud (email/password + Google OAuth)
- [ ] Replace mock generators with server functions
- [ ] Wire TanStack Query loaders
- [ ] Real websocket stream for events
- [ ] Persisted incidents + comments
- [ ] Server-side search index for command palette global search
- [ ] Persistent notification and case state
- [ ] API key and webhook delivery with real endpoints

## Tech debt
- [ ] Table virtualization once event count exceeds ~2k visible rows
- [ ] Storybook for the design system primitives
- [ ] Playwright smoke tests for the auth gate + inspector
- [ ] Extract inspector panel entity renderers into separate lazy-loaded modules (file is 700+ lines)
- [ ] Add route-level error boundaries using ErrorBoundary from ux-utilities
- [ ] Replace mock search data in command-palette with route-aware search index
- [ ] Standardize PageHeader + PageSkeleton usage across all routes for consistent loading states
- [ ] Extract sidebar navigation config into shared constant (currently duplicated between app-sidebar and command-palette)
- [ ] Add unit tests for realtime hooks (useConnectionState, useStreamStats, useLiveEvents)
- [ ] Migrate inspector-store to support all 6 entity types with type-safe discriminated union
