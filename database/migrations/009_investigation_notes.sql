-- Collaborative notes attached to investigation notebooks
CREATE TABLE IF NOT EXISTS investigation_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES investigation_notebooks(id) ON DELETE CASCADE,
  author_id        UUID,
  author_name      VARCHAR(255),
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_notes_org ON investigation_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_investigation_notes_investigation ON investigation_notes(investigation_id, created_at);

-- Enable RLS (tenant isolation via app.current_org GUC)
ALTER TABLE investigation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY investigation_notes_org_policy ON investigation_notes
  USING (organization_id::text = current_setting('app.current_org', true));
