-- Notification channels, routing rules, and escalation policies for alert response automation
CREATE TABLE IF NOT EXISTS notification_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50) NOT NULL,
  target          TEXT NOT NULL,
  config          JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routing_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  conditions      JSONB NOT NULL DEFAULT '{}',
  channel_id      UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  priority        INTEGER DEFAULT 100,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  steps           JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_org ON notification_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_org ON routing_rules(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_escalation_policies_org ON escalation_policies(organization_id);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_channels_org_policy ON notification_channels
  USING (organization_id::text = current_setting('app.current_org', true));

CREATE POLICY routing_rules_org_policy ON routing_rules
  USING (organization_id::text = current_setting('app.current_org', true));

CREATE POLICY escalation_policies_org_policy ON escalation_policies
  USING (organization_id::text = current_setting('app.current_org', true));
