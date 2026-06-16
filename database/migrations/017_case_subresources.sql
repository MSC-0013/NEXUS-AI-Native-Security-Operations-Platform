-- Case sub-resources: evidence, tasks, activity feed, watchers
CREATE TABLE IF NOT EXISTS case_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  added_by        UUID,
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  file_name       VARCHAR(255),
  file_size_bytes BIGINT,
  mime_type       VARCHAR(100),
  storage_uri     TEXT,
  hash_sha256     VARCHAR(64),
  added_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'open',
  assignee_id     UUID,
  due_date        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id        UUID,
  actor_name      VARCHAR(255),
  action_type     VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_watchers (
  case_id  UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_case ON case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_case_activity_case ON case_activity(case_id, created_at);

ALTER TABLE case_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_evidence_org_policy ON case_evidence
  USING (organization_id::text = current_setting('app.current_org', true));

ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_tasks_org_policy ON case_tasks
  USING (organization_id::text = current_setting('app.current_org', true));

ALTER TABLE case_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_activity_org_policy ON case_activity
  USING (organization_id::text = current_setting('app.current_org', true));

ALTER TABLE case_watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_case_watchers ON case_watchers;
CREATE POLICY rls_case_watchers ON case_watchers
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_watchers.case_id
        AND c.organization_id::text = current_setting('app.current_org', true)
    )
  );
