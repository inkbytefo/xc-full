-- 000015_moderation_system.down.sql

-- Use IF EXISTS since column might already be in base migration
ALTER TABLE server_members
DROP COLUMN IF EXISTS communication_disabled_until;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS server_bans;
