-- Investigation evidence and identified entities
CREATE TABLE IF NOT EXISTS investigation_evidence (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES investigation_notebooks(id) ON DELETE CASCADE,
  added_by         UUID,
  type             VARCHAR(50) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  mime_type        VARCHAR(100),
  storage_uri      TEXT,
  hash_sha256      VARCHAR(64),
  added_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_entities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES investigation_notebooks(id) ON DELETE CASCADE,
  entity_type      VARCHAR(50) NOT NULL,
  entity_value     TEXT NOT NULL,
  notes            TEXT,
  added_by         UUID,
  added_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_evidence_investigation ON investigation_evidence(investigation_id);
CREATE INDEX IF NOT EXISTS idx_investigation_entities_investigation ON investigation_entities(investigation_id);

ALTER TABLE investigation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY investigation_evidence_org_policy ON investigation_evidence
  USING (organization_id::text = current_setting('app.current_org', true));

ALTER TABLE investigation_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY investigation_entities_org_policy ON investigation_entities
  USING (organization_id::text = current_setting('app.current_org', true));
