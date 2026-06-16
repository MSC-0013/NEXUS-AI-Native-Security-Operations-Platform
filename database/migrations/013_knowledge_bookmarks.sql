-- Per-user knowledge article bookmarks
CREATE TABLE IF NOT EXISTS knowledge_bookmarks (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id      UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_bookmarks_org ON knowledge_bookmarks(organization_id);

ALTER TABLE knowledge_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_bookmarks_org_policy ON knowledge_bookmarks
  USING (organization_id::text = current_setting('app.current_org', true));
