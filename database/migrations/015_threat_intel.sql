-- Ransomware groups and threat campaigns: global threat-intel reference data,
-- same sharing model as threat_actors (no organization_id; readable by any
-- authenticated tenant, not user-editable through the org API).
CREATE TABLE IF NOT EXISTS ransomware_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL UNIQUE,
  encryption      VARCHAR(255),
  sectors         JSONB DEFAULT '[]',
  recent_victims  JSONB DEFAULT '[]',
  severity        VARCHAR(20) DEFAULT 'high',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threat_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  sectors     JSONB DEFAULT '[]',
  severity    VARCHAR(20) DEFAULT 'high',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_actors (
  campaign_id UUID NOT NULL REFERENCES threat_campaigns(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES threat_actors(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, actor_id)
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES threat_campaigns(id) ON DELETE CASCADE,
  event_at     TIMESTAMPTZ NOT NULL,
  description  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id, event_at);

ALTER TABLE ransomware_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_ransomware_groups ON ransomware_groups;
CREATE POLICY rls_ransomware_groups ON ransomware_groups
  USING (current_setting('app.current_org', true) <> '');

ALTER TABLE threat_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_threat_campaigns ON threat_campaigns;
CREATE POLICY rls_threat_campaigns ON threat_campaigns
  USING (current_setting('app.current_org', true) <> '');

ALTER TABLE campaign_actors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_campaign_actors ON campaign_actors;
CREATE POLICY rls_campaign_actors ON campaign_actors
  USING (current_setting('app.current_org', true) <> '');

ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_campaign_events ON campaign_events;
CREATE POLICY rls_campaign_events ON campaign_events
  USING (current_setting('app.current_org', true) <> '');
