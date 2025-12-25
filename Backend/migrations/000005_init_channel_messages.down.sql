-- 000005_init_channel_messages.down.sql
-- Rollback channel messages table

DROP TRIGGER IF EXISTS update_channel_messages_updated_at ON channel_messages;
DROP TABLE IF EXISTS channel_messages;
