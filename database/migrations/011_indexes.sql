-- Migration 011: Performance indexes for high-volume tables
-- These cover the most common filter patterns in the API layer.

BEGIN;

-- ── security_events ──────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_org_severity
  ON security_events (organization_id, severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_org_type_time
  ON security_events (organization_id, type, event_timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_org_time
  ON security_events (organization_id, event_timestamp DESC);

-- ── incidents ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_org_severity
  ON incidents (organization_id, severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_org_status
  ON incidents (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_sla_breach
  ON incidents (organization_id, sla_breach_at)
  WHERE sla_breached = false AND status NOT IN ('resolved', 'closed');

-- ── alerts ───────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_org_status
  ON alerts (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_org_severity
  ON alerts (organization_id, severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_dedup_key
  ON alerts (organization_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

-- ── endpoints ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_org_status
  ON endpoints (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_org_isolated
  ON endpoints (organization_id, is_isolated)
  WHERE is_isolated = true;

-- ── network_flows ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_flows_org_malicious
  ON network_flows (organization_id, is_malicious, flow_start DESC)
  WHERE is_malicious = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_flows_org_start
  ON network_flows (organization_id, flow_start DESC);

-- ── dns_queries ──────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_queries_org_dga
  ON dns_queries (organization_id, is_dga)
  WHERE is_dga = true;

-- ── asset_vulnerabilities ────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_vulns_org_status
  ON asset_vulnerabilities (organization_id, status);

-- ── webhook_deliveries ───────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_webhook_time
  ON webhook_deliveries (webhook_id, delivered_at DESC);

-- ── copilot_messages ─────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_copilot_messages_session
  ON copilot_messages (session_id, created_at DESC);

-- ── audit_logs ───────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_time
  ON audit_logs (organization_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (organization_id, resource_type, resource_id);

-- ── notifications ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications (organization_id, user_id, is_read, created_at DESC)
  WHERE is_read = false;

COMMIT;
