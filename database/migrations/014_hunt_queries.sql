-- Saved threat-hunting queries
CREATE TABLE IF NOT EXISTS hunt_queries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by       UUID,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  query            TEXT NOT NULL,
  severity         VARCHAR(20) DEFAULT 'medium',
  schedule_minutes INTEGER,
  is_enabled       BOOLEAN DEFAULT TRUE,
  last_run_at      TIMESTAMPTZ,
  last_hit_count   INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hunt_queries_org ON hunt_queries(organization_id);

ALTER TABLE hunt_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY hunt_queries_org_policy ON hunt_queries
  USING (organization_id::text = current_setting('app.current_org', true));
