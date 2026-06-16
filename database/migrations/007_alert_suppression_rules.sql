-- Alert suppression rules table
CREATE TABLE IF NOT EXISTS alert_suppression_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  condition       TEXT NOT NULL,
  created_by      VARCHAR(255),
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_suppression_rules_org ON alert_suppression_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_suppression_rules_active ON alert_suppression_rules(organization_id, is_active);

-- Enable RLS
ALTER TABLE alert_suppression_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_suppression_rules_org_policy ON alert_suppression_rules
  USING (organization_id::text = current_setting('app.current_org', true));
