-- Cloud account connect/sync support + closing an RLS gap: cloud_accounts,
-- cloud_assets, and cloud_iam_findings had no row-level security policy at
-- all prior to this migration (verified against 002_rls_and_rag.sql).
ALTER TABLE cloud_accounts ADD COLUMN IF NOT EXISTS credentials_encrypted TEXT;

ALTER TABLE cloud_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_cloud_accounts ON cloud_accounts;
CREATE POLICY rls_cloud_accounts ON cloud_accounts
  USING (organization_id::text = current_setting('app.current_org', true));

ALTER TABLE cloud_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_cloud_assets ON cloud_assets;
CREATE POLICY rls_cloud_assets ON cloud_assets
  USING (
    EXISTS (
      SELECT 1 FROM cloud_accounts ca
      WHERE ca.id = cloud_assets.cloud_account_id
        AND ca.organization_id::text = current_setting('app.current_org', true)
    )
  );

ALTER TABLE cloud_iam_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_cloud_iam_findings ON cloud_iam_findings;
CREATE POLICY rls_cloud_iam_findings ON cloud_iam_findings
  USING (
    EXISTS (
      SELECT 1 FROM cloud_accounts ca
      WHERE ca.id = cloud_iam_findings.cloud_account_id
        AND ca.organization_id::text = current_setting('app.current_org', true)
    )
  );
