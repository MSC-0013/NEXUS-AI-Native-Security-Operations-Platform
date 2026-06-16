-- Migration 006: Update role permissions to include new manage:* permissions
-- This ensures the new permissions are reflected in JWT tokens on next login.

UPDATE roles
SET permissions = '["*"]'::jsonb
WHERE name = 'super_admin'
  AND organization_id = '00000000-0000-0000-0000-000000000002';

UPDATE roles
SET permissions = '["view:*","act:incidents","manage:integrations","manage:accounts","manage:settings","manage:knowledge","manage:cases","manage:sso","manage:policies"]'::jsonb
WHERE name = 'security_admin'
  AND organization_id = '00000000-0000-0000-0000-000000000002';

UPDATE roles
SET permissions = '["view:dashboard","view:events","view:incidents","act:incidents","view:alerts","view:notifications","view:cases","view:threat-intel","view:endpoints","view:identity","view:cloud","view:vulnerabilities","view:network","view:attack-graph","view:copilot","view:investigations","view:hunt","view:forensics","view:timeline","view:security-graph","view:query","view:detection-rules","view:audit","view:status","view:knowledge","manage:knowledge","manage:cases","view:reports"]'::jsonb
WHERE name = 'soc_analyst'
  AND organization_id = '00000000-0000-0000-0000-000000000002';

UPDATE roles
SET permissions = '["view:dashboard","view:events","view:incidents","act:incidents","view:alerts","view:notifications","view:cases","view:endpoints","view:identity","view:network","view:attack-graph","view:investigations","view:forensics","view:timeline","view:copilot","view:audit","view:status","manage:cases"]'::jsonb
WHERE name = 'incident_responder'
  AND organization_id = '00000000-0000-0000-0000-000000000002';

UPDATE roles
SET permissions = '["view:dashboard","view:executive","view:compliance","view:audit","view:policies","manage:policies","view:ownership","view:reports","view:knowledge","view:access-matrix"]'::jsonb
WHERE name = 'compliance_officer'
  AND organization_id = '00000000-0000-0000-0000-000000000002';
