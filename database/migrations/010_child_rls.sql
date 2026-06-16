-- Migration 010: Enable RLS on child/junction tables missed in 002_rls_and_rag.sql
-- These tables have implicit tenant scope via parent FK but need explicit RLS so
-- direct queries cannot bypass the parent's policy.

BEGIN;

-- ── Incident child tables ────────────────────────────────────────────────────

ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_timeline ON incident_timeline;
CREATE POLICY rls_incident_timeline ON incident_timeline
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_timeline.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_comments ON incident_comments;
CREATE POLICY rls_incident_comments ON incident_comments
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_comments.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_evidence ON incident_evidence;
CREATE POLICY rls_incident_evidence ON incident_evidence
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_evidence.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_recommendations ON incident_recommendations;
CREATE POLICY rls_incident_recommendations ON incident_recommendations
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_recommendations.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_responders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_responders ON incident_responders;
CREATE POLICY rls_incident_responders ON incident_responders
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_responders.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_mitre_techniques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_mitre_techniques ON incident_mitre_techniques;
CREATE POLICY rls_incident_mitre_techniques ON incident_mitre_techniques
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_mitre_techniques.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE incident_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_alerts ON incident_alerts;
CREATE POLICY rls_incident_alerts ON incident_alerts
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_alerts.incident_id
        AND i.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Endpoint child tables ────────────────────────────────────────────────────

ALTER TABLE endpoint_processes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_endpoint_processes ON endpoint_processes;
CREATE POLICY rls_endpoint_processes ON endpoint_processes
  USING (
    EXISTS (
      SELECT 1 FROM endpoints e
      WHERE e.id = endpoint_processes.endpoint_id
        AND e.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE endpoint_network_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_endpoint_network_connections ON endpoint_network_connections;
CREATE POLICY rls_endpoint_network_connections ON endpoint_network_connections
  USING (
    EXISTS (
      SELECT 1 FROM endpoints e
      WHERE e.id = endpoint_network_connections.endpoint_id
        AND e.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE endpoint_malware_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_endpoint_malware_indicators ON endpoint_malware_indicators;
CREATE POLICY rls_endpoint_malware_indicators ON endpoint_malware_indicators
  USING (
    EXISTS (
      SELECT 1 FROM endpoints e
      WHERE e.id = endpoint_malware_indicators.endpoint_id
        AND e.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Cloud child tables ───────────────────────────────────────────────────────

ALTER TABLE cloud_compliance_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_cloud_compliance_checks ON cloud_compliance_checks;
CREATE POLICY rls_cloud_compliance_checks ON cloud_compliance_checks
  USING (
    EXISTS (
      SELECT 1 FROM cloud_assets ca
      JOIN cloud_accounts cac ON cac.id = ca.cloud_account_id
      WHERE ca.id = cloud_compliance_checks.cloud_asset_id
        AND cac.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Copilot messages ─────────────────────────────────────────────────────────

ALTER TABLE copilot_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_copilot_messages ON copilot_messages;
CREATE POLICY rls_copilot_messages ON copilot_messages
  USING (
    EXISTS (
      SELECT 1 FROM copilot_sessions cs
      WHERE cs.id = copilot_messages.session_id
        AND cs.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Case child tables ────────────────────────────────────────────────────────

ALTER TABLE case_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_case_incidents ON case_incidents;
CREATE POLICY rls_case_incidents ON case_incidents
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_incidents.case_id
        AND c.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Investigation children ───────────────────────────────────────────────────

ALTER TABLE investigation_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_investigation_notes ON investigation_notes;
CREATE POLICY rls_investigation_notes ON investigation_notes
  USING (
    organization_id::text = current_setting('app.current_org', true)
  );

-- ── Runbook children ─────────────────────────────────────────────────────────

ALTER TABLE runbook_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_runbook_steps ON runbook_steps;
CREATE POLICY rls_runbook_steps ON runbook_steps
  USING (
    EXISTS (
      SELECT 1 FROM runbooks rb
      WHERE rb.id = runbook_steps.runbook_id
        AND rb.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE runbook_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_runbook_executions ON runbook_executions;
CREATE POLICY rls_runbook_executions ON runbook_executions
  USING (
    EXISTS (
      SELECT 1 FROM runbooks rb
      WHERE rb.id = runbook_executions.runbook_id
        AND rb.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Scheduled reports & webhook deliveries ───────────────────────────────────

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_scheduled_reports ON scheduled_reports;
CREATE POLICY rls_scheduled_reports ON scheduled_reports
  USING (
    organization_id::text = current_setting('app.current_org', true)
  );

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_webhook_deliveries ON webhook_deliveries;
CREATE POLICY rls_webhook_deliveries ON webhook_deliveries
  USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      WHERE w.id = webhook_deliveries.webhook_id
        AND w.organization_id::text = current_setting('app.current_org', true)
    )
  );

-- ── Threat intel (global reference tables that have org rows) ─────────────────

ALTER TABLE iocs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_iocs ON iocs;
CREATE POLICY rls_iocs ON iocs
  USING (
    organization_id IS NULL
    OR organization_id::text = current_setting('app.current_org', true)
  );

-- Global (org-less) reference tables — allow read for all authenticated tenants
ALTER TABLE threat_actor_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_threat_actor_timeline ON threat_actor_timeline;
CREATE POLICY rls_threat_actor_timeline ON threat_actor_timeline
  USING (current_setting('app.current_org', true) <> '');

COMMIT;
