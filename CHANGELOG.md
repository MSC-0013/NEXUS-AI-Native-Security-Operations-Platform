# Changelog

All notable changes to the NEXUS project are documented in this file.

## [0.3.0] — 2026-05-23

### Phase 3 — Intelligence Layer

The platform evolves from an operational console into an intelligence-driven security operations workspace with cross-module correlation, AI reasoning, collaborative workflows, and enterprise multi-tenancy.

#### New Pages

- **/timeline** — Unified operational timeline aggregating alerts, incidents, deployments, AI events, endpoint changes, and policy events with severity grouping and correlation badges
- **/hunt** — Threat hunting workbench with query editor, saved hunting queries, IOC search, anomaly detection, attack pivots, and behavioral analytics
- **/policies** — Policy engine with detection, alert, IAM, endpoint, retention, and AI governance policies with toggle controls and violation tracking
- **/security-graph** — Relationship intelligence graph showing entity correlations, attack propagation, blast radius, and AI correlation summaries
- **/query** — SIEM query language system with syntax editor, autocomplete, saved queries, query history, templates, and results table
- **/billing** — Billing and usage platform with plan details, usage quotas, seat management, ingestion breakdown, and billing history
- **/sso** — SSO and enterprise identity management with SAML/Okta/Azure AD/Google Workspace providers, directory sync, and provisioning settings
- **/automation** — Automation workflows with trigger-action chains, alert automation, remediation workflows, auto-ticketing, and integration status
- **/forensics** — Forensics workbench with file timeline, process tree, memory artifacts, suspicious binaries, and evidence viewer
- **/detection-rules** — Detection rule builder with Sigma-like rules, condition builder UI, logic tree visualization, realtime testing, and rule simulation
- **/digital-twin** — Digital twin infrastructure view with live topology, health/security/traffic overlays, and service relationship visualization
- **/attack-replay** — Attack replay engine with step-by-step playback of historical incidents, kill chain timeline, and detection gap analysis
- **/threat-simulation** — Threat simulation engine with ransomware, credential stuffing, lateral movement, phishing, and supply chain attack scenarios
- **/executive** — Executive security dashboard with risk posture, compliance scores, financial impact, SLA performance, and attack trends
- **/ownership** — Service ownership system with service catalog, on-call scheduling, escalation chains, team metrics, and unassigned entity management

#### Infrastructure

- **Multi-tenant workspace system** — Workspace store with org isolation, environment switching (prod/stage/dev), region scoping, and workspaceSwitcher component in topbar
- **Collaboration store** — Collaborators with presence tracking, threaded comments with mentions/reactions, annotations with position data, and page-level presence
- **Correlation engine** — Cross-module correlation store linking incidents to alerts, endpoints, vulnerabilities, actors, and cloud assets with AI summaries and blast radius calculation
- **Sidebar navigation** — Expanded to 7 groups (Operate, Detect, Investigate, Analyze, Govern, Platform, Admin) with all new routes
- **Topbar** — Added WorkspaceSwitcher component with org switching, environment chips, and region selector

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
