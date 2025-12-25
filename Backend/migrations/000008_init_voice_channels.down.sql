-- 000008_init_voice_channels.down.sql
-- Rollback voice channels tables

DROP TRIGGER IF EXISTS update_voice_channels_updated_at ON voice_channels;
DROP TABLE IF EXISTS voice_participants;
DROP TABLE IF EXISTS voice_channels;
