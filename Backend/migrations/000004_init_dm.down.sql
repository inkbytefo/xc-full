-- 000004_init_dm.down.sql
-- Rollback DM tables

DROP TRIGGER IF EXISTS update_dm_messages_updated_at ON dm_messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

DROP TABLE IF EXISTS dm_messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
