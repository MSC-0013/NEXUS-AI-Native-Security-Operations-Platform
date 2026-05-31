-- 005_users_and_rich_seed.sql

-- 1. Deduplicate roles
-- Keep the oldest role per name in each organization, delete the rest
DELETE FROM roles
WHERE id NOT IN (
    SELECT MIN(id::text)::uuid
    FROM roles
    GROUP BY organization_id, name
);

-- Add UNIQUE constraint to prevent future duplicates (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'roles_org_name_key'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_org_name_key UNIQUE (organization_id, name);
    END IF;
END $$;

-- Define Org ID
-- Acme Federal: 00000000-0000-0000-0000-000000000002

-- 2. Insert 7 Role-Specific Users (passwords handled in app layer fallback)
INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 'admin@acme.federal', 'Admin User', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'super_admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 'j.okafor@acme.federal', 'J. Okafor', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'soc_analyst'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000022'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 'h.tanaka@acme.federal', 'H. Tanaka', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'threat_hunter'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000023'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 'marco.cruz@acme.federal', 'Marco Cruz', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'incident_responder'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000024'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 'n.patel@acme.federal', 'N. Patel', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'compliance_officer'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, organization_id, role_id, email, full_name, workspace_name, status)
SELECT 
  '00000000-0000-0000-0000-000000000025'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, id, 's.ivanov@acme.federal', 'S. Ivanov', 'Acme Federal', 'active'
FROM roles WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND name = 'viewer'
ON CONFLICT (email) DO NOTHING;


-- 3. Seed rich data
-- Generate 100 security events
INSERT INTO security_events (organization_id, event_timestamp, type, severity, source, source_ip, dest_ip, username, host, rule_name, message, country_code, asset, mitre_technique)
SELECT
  '00000000-0000-0000-0000-000000000002',
  NOW() - (n || ' minutes')::interval,
  (ARRAY['failed_login','malware_detection','suspicious_process','dns_anomaly','privilege_escalation','data_exfiltration','brute_force','ransomware','lateral_movement','c2_communication'])[1 + (n % 10)]::event_type,
  (ARRAY['critical','high','medium','low','info']::severity_level[])[1 + (n % 5)],
  (ARRAY['CrowdStrike','Okta','AWS CloudTrail','Zscaler','Palo Alto'])[1 + (n % 5)],
  '10.0.' || (n % 255) || '.' || ((n * 13) % 255),
  '192.168.1.' || (n % 100),
  (ARRAY['j.okafor','h.tanaka','marco.cruz','n.patel','s.ivanov','svc-deploy','SYSTEM'])[1 + (n % 7)],
  'endpoint-' || lpad((n % 20)::text, 4, '0'),
  'RULE-' || lpad((n % 15)::text, 4, '0'),
  'Automated detection message #' || n,
  (ARRAY['US','UK','DE','FR','JP','IN'])[1 + (n % 6)],
  'asset-' || (n % 10),
  'T' || (1000 + (n % 200))
FROM generate_series(1, 100) AS n;

-- Generate 30 alerts
INSERT INTO alerts (organization_id, title, description, severity, status, ai_priority_score, dedup_count, is_escalated, is_acknowledged, source_ip, mitre_technique)
SELECT
  '00000000-0000-0000-0000-000000000002',
  'Alert: ' || (ARRAY['Suspicious Login','Malware Blocked','Exfiltration Attempt','C2 Beacon'])[1 + (n % 4)],
  'Detailed alert description for event #' || n,
  (ARRAY['critical','high','medium','low']::severity_level[])[1 + (n % 4)],
  (ARRAY['new','triaging','acknowledged','escalated','resolved']::alert_status[])[1 + (n % 5)],
  50 + (n % 50),
  1 + (n % 10),
  (n % 5 = 0),
  (n % 3 = 0),
  '10.0.' || (n % 255) || '.50',
  'T' || (1000 + (n % 200))
FROM generate_series(1, 30) AS n;

-- Generate 15 incidents
INSERT INTO incidents (id, organization_id, incident_code, title, severity, status, lead_investigator_id, category, affected_assets_count, affected_users_count, summary, opened_at)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  'INC-' || (2000 + n),
  'Incident: ' || (ARRAY['Data Breach','Ransomware','Insider Threat','DDoS'])[1 + (n % 4)],
  (ARRAY['critical','high','medium']::severity_level[])[1 + (n % 3)],
  (ARRAY['open','investigating','contained','eradicated','closed']::incident_status[])[1 + (n % 5)],
  (ARRAY['00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000023'::uuid])[1 + (n % 3)],
  (ARRAY['Malware','Identity','Network','Cloud'])[1 + (n % 4)],
  n % 5,
  n % 3,
  'Summary of investigation ' || n,
  NOW() - (n || ' hours')::interval
FROM generate_series(1, 15) AS n;

-- Generate 20 endpoints
INSERT INTO endpoints (id, organization_id, hostname, os, ip_address, status, risk_overall, risk_malware, risk_network, risk_credential, risk_behavior, last_check_in, is_isolated)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  'host-' || lpad(n::text, 4, '0'),
  (ARRAY['windows','linux','macos']::endpoint_os[])[1 + (n % 3)],
  '10.1.' || (n % 255) || '.' || n,
  (ARRAY['healthy','offline','compromised']::endpoint_status[])[1 + (n % 3)],
  20 + (n % 80),
  10 + (n % 40),
  10 + (n % 40),
  10 + (n % 40),
  10 + (n % 40),
  NOW() - (n || ' minutes')::interval,
  (n % 10 = 0)
FROM generate_series(1, 20) AS n;

-- Generate cases
INSERT INTO cases (id, organization_id, case_number, title, status, priority)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  'CASE-' || (3000 + n),
  'Investigation Case ' || n,
  'open',
  (ARRAY['critical','high','medium']::severity_level[])[1 + (n % 3)]
FROM generate_series(1, 10) AS n;

-- Generate runbooks
INSERT INTO runbooks (id, organization_id, name, description, category, is_automated, is_enabled)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  'Runbook ' || n,
  'Automated response playbook ' || n,
  (ARRAY['Malware','Identity','Network'])[1 + (n % 3)],
  (n % 2 = 0),
  true
FROM generate_series(1, 5) AS n;

-- Generate compliance assessments
INSERT INTO compliance_assessments (id, organization_id, framework, name, total_controls, passed_controls, score_percent, status)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  (ARRAY['SOC2','ISO27001','PCI_DSS','HIPAA','GDPR']::compliance_framework[])[n],
  '2024 Audit - ' || (ARRAY['SOC2','ISO27001','PCI_DSS','HIPAA','GDPR'])[n],
  100,
  80 + (n * 3),
  80.0 + (n * 3.0),
  'in_progress'
FROM generate_series(1, 5) AS n;

-- Generate Reports
INSERT INTO reports (id, organization_id, report_type, title, status, generated_at)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  (ARRAY['executive','soc','compliance'])[1 + (n % 3)],
  'Monthly Report ' || n,
  (ARRAY['completed','pending'])[1 + (n % 2)],
  CASE WHEN n % 2 = 0 THEN NOW() ELSE NULL END
FROM generate_series(1, 10) AS n;

-- Generate Attack Graphs
INSERT INTO attack_graphs (id, organization_id, name, description)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  '00000000-0000-0000-0000-000000000002',
  'Attack Path Analysis ' || n,
  'Generated graph for potential lateral movement'
FROM generate_series(1, 3) AS n;
