-- 000008_init_voice_channels.down.sql
-- Rollback voice participants

DROP INDEX IF EXISTS idx_voice_participants_channel;
DROP TABLE IF EXISTS voice_participants;
