-- 000006_init_live.down.sql
-- Rollback live streaming tables

DROP TRIGGER IF EXISTS update_streams_updated_at ON streams;
DROP TABLE IF EXISTS stream_viewers;
DROP TABLE IF EXISTS streams;
DROP TABLE IF EXISTS stream_categories;
