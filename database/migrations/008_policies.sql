CREATE TABLE IF NOT EXISTS policies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  category         VARCHAR(50) NOT NULL,
  severity         VARCHAR(20) DEFAULT 'medium',
  is_enabled       BOOLEAN DEFAULT TRUE,
  violation_count  INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_org_category ON policies(organization_id, category);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY policies_org_policy ON policies
  USING (organization_id::text = current_setting('app.current_org', true));

-- Seed default policies for all existing orgs
INSERT INTO policies (organization_id, name, description, category, severity, is_enabled, violation_count)
SELECT
  o.id,
  p.name, p.description, p.category, p.severity, p.is_enabled, p.violation_count
FROM organizations o
CROSS JOIN (VALUES
  ('P1 Critical Escalation', 'Auto-escalate critical alerts to SOC lead within 5 minutes', 'alert', 'critical', true, 1),
  ('Alert Suppression — Health Checks', 'Suppress false positive alerts from health check endpoints', 'alert', 'info', true, 0),
  ('Slack Notification — High Severity', 'Post high-severity alerts to #soc-alerts Slack channel', 'alert', 'high', true, 0),
  ('PagerDuty — Critical Only', 'Page on-call for critical severity alerts only', 'alert', 'critical', true, 0),
  ('No Wildcard Permissions', 'Block IAM roles with s3:* or *:* resource access in production', 'iam', 'high', true, 2),
  ('MFA Required for Admin', 'Require MFA for all admin-level API operations', 'iam', 'critical', true, 0),
  ('Cross-Account Access Review', 'Flag cross-account IAM access for quarterly review', 'iam', 'medium', true, 4),
  ('Service Account Key Rotation', 'Enforce 90-day key rotation for service accounts', 'iam', 'medium', false, 8),
  ('USB Device Block', 'Block unauthorized USB mass storage devices on production endpoints', 'endpoint', 'high', true, 3),
  ('Agent Health Monitoring', 'Alert when endpoint agent offline > 15 minutes', 'endpoint', 'medium', true, 1),
  ('Disk Encryption Required', 'Require BitLocker/FileVault on all managed endpoints', 'endpoint', 'high', true, 12),
  ('Event Retention — 90 Days', 'Retain security events for 90 days, compress after 30', 'retention', 'info', true, 0),
  ('Incident Data — 1 Year', 'Retain incident records and evidence for 1 year for compliance', 'retention', 'info', true, 0),
  ('Log Archival — 7 Years', 'Archive raw logs to cold storage after 90 days, retain 7 years', 'retention', 'info', true, 0),
  ('AI Data Scope Restriction', 'Restrict AI processing to non-PII data fields only', 'ai', 'high', true, 0),
  ('AI Output Review Required', 'Critical AI recommendations require human review before action', 'ai', 'high', true, 1),
  ('Model Version Gating', 'Only approved AI model versions can run in production', 'ai', 'medium', true, 0)
) AS p(name, description, category, severity, is_enabled, violation_count)
ON CONFLICT DO NOTHING;
