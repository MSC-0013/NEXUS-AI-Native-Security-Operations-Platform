# Changelog

All notable changes to the NEXUS project are documented in this file.

## [0.2.0] — 2026-05-23

### Phase 2 Evolution

The platform expands from a core SOC console into a full-featured security operations suite with 11 new pages, 7 upgraded modules, and major infrastructure improvements.

#### New Pages

- **/landing** — Enterprise landing page with module overview cards and quick-access navigation
- **/profile** — User profile and security settings management
- **/notifications** — Centralized notification center for alerts and system messages
- **/investigations** — Investigation notebooks workspace for collaborative analysis
- **/cases** — Case management system for tracking and coordinating response efforts
- **/reports** — Reporting and analytics system for generating security summaries
- **/developer** — API key and webhook management platform for integrations
- **/status** — System status page for service availability and incident tracking
- **/onboarding** — Guided onboarding flow for new users
- **/knowledge** — Knowledge base and runbooks for operational procedures
- **/platform-health** — Platform health monitoring dashboard for service metrics

#### Upgraded Modules

- **AI Copilot** — Added 7 workflow types: incident explanation, remediation plans, anomaly clustering, threat prioritization, attack chain analysis, query generation, investigation assistant
- **Incidents** — Added evidence collection, responder tracking, SLA timer, severity escalation, communication log, root cause workflow, remediation progress tracking, postmortem generation
- **Alerts** — Added suppressions, escalation chains, mute/snooze, routing rules, notification channels, deduplication, AI prioritization scoring
- **Attack Graph** — Added animated attack paths, lateral movement visualization, compromised node highlighting, blast radius analysis, dependency overlays
- **Endpoints** — Added process trees, device telemetry, malware indicators, isolation actions, session tracking, behavioral analytics
- **Cloud Security** — Added exposed asset detection, IAM analysis, storage exposure analysis, risk scoring, region mapping, compliance overlays
- **Threat Intel** — Added actor profiles, ransomware tracking, IOC feeds, campaign timelines, exploit tracking

#### Infrastructure Improvements

- **Inspector panel** — Expanded from 2 entity types (event, incident) to 6 (event, incident, alert, endpoint, vulnerability, actor) with full detail views for each
- **Command palette** — Added global search across entity types, saved queries, recent items, and filter hints (severity:, source:, type:, status:)
- **Realtime system** — Added connection state tracking (connected/reconnecting/disconnected), stream stats (events/sec, throughput, buffer, lag), and stale data warnings
- **UX utilities** — Added PageSkeleton, EmptyState, ErrorBoundary, LoadingCard, LoadingTable, StaleDataWarning, ConfirmDialog, PageHeader as reusable primitives
- **Sidebar navigation** — Expanded from 4 groups (Operate, Detect, Investigate, Govern) to 5 with new Platform group (Reports, Developer, System Status, Knowledge Base, Platform Health)
