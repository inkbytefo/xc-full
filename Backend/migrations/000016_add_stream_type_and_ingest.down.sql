-- 000016_add_stream_type_and_ingest.down.sql
-- Rollback stream type and ingest fields

ALTER TABLE streams DROP CONSTRAINT IF EXISTS stream_server_consistency;
ALTER TABLE streams DROP CONSTRAINT IF EXISTS stream_max_quality_valid;
ALTER TABLE streams DROP CONSTRAINT IF EXISTS stream_type_valid;

DROP INDEX IF EXISTS idx_streams_type;
DROP INDEX IF EXISTS idx_streams_server_id;

ALTER TABLE streams DROP COLUMN IF EXISTS max_quality;
ALTER TABLE streams DROP COLUMN IF EXISTS playback_url;
ALTER TABLE streams DROP COLUMN IF EXISTS ingest_url;
ALTER TABLE streams DROP COLUMN IF EXISTS server_id;
ALTER TABLE streams DROP COLUMN IF EXISTS type;
