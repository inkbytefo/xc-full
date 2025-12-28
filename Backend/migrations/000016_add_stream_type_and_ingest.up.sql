-- 000016_add_stream_type_and_ingest.up.sql
-- Add stream type and OvenMediaEngine ingest fields

-- Stream type: user (personal) or server (professional)
ALTER TABLE streams ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'user';
ALTER TABLE streams ADD COLUMN server_id VARCHAR(26) REFERENCES servers(id) ON DELETE CASCADE;

-- OvenMediaEngine ingest fields
ALTER TABLE streams ADD COLUMN ingest_url TEXT;
ALTER TABLE streams ADD COLUMN playback_url TEXT;
ALTER TABLE streams ADD COLUMN max_quality VARCHAR(10) NOT NULL DEFAULT '720p';

-- Indexes for server streams
CREATE INDEX idx_streams_server_id ON streams(server_id) WHERE server_id IS NOT NULL;
CREATE INDEX idx_streams_type ON streams(type);

-- Constraints
ALTER TABLE streams ADD CONSTRAINT stream_type_valid CHECK (type IN ('user', 'server'));
ALTER TABLE streams ADD CONSTRAINT stream_max_quality_valid CHECK (max_quality IN ('480p', '720p', '1080p'));

-- Server stream must have server_id
ALTER TABLE streams ADD CONSTRAINT stream_server_consistency 
    CHECK ((type = 'user' AND server_id IS NULL) OR (type = 'server' AND server_id IS NOT NULL));
