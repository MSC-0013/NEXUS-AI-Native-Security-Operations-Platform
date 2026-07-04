-- Ensure showcase/demo users can authenticate when NODE_ENV=production.
-- Demo fallback passwords are intentionally disabled in production, so these
-- accounts need persisted bcrypt hashes.

UPDATE users SET password_hash = '$2a$10$iFhv/BPP8PqNb8LDanpn1.vE1mohYT3uWGoo57/Jc52VhzMQmpaBC'
WHERE email = 'admin@acme.federal';

UPDATE users SET password_hash = '$2a$10$/lRfKmxyMGEeI8kWJFkZyu1BuJ8NvnlGQ8zdu/13wYerk7f1mZxBe'
WHERE email = 'amelia.lee@acme.federal';

UPDATE users SET password_hash = '$2a$10$BzfcRmDRTSyObsKzMU/pw.r800n8rYi7D9xCalOtIQh5rK56LoYSS'
WHERE email = 'j.okafor@acme.federal';

UPDATE users SET password_hash = '$2a$10$q7szAGoEmV/jlLTFYQ4l7uJtKWq.rx2cH.ls9JOkNQv/bt/k4BhIW'
WHERE email = 'h.tanaka@acme.federal';

UPDATE users SET password_hash = '$2a$10$W2hqT86kSKQbyOmM9mzSlO7ciheRJFXjsnSTRZBNol3OaDBpDMRv6'
WHERE email = 'marco.cruz@acme.federal';

UPDATE users SET password_hash = '$2a$10$2wZhMuKzBeKCwanXchtngeW0RMkoYma7jEHxiTvnKOwRrL8wiXPlS'
WHERE email = 'n.patel@acme.federal';

UPDATE users SET password_hash = '$2a$10$QO6iXaLgxljjGBsfGg1nAOYFWOsIDTteLET4InvEHq7zFRUlz11bW'
WHERE email = 's.ivanov@acme.federal';
