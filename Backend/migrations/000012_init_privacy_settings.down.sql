-- 000012_init_privacy_settings.down.sql
-- Rollback privacy settings table

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON privacy_settings;
DROP INDEX IF EXISTS idx_privacy_settings_user_id;
DROP TABLE IF EXISTS privacy_settings;
