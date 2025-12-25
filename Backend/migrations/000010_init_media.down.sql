-- Drop media indexes
DROP INDEX IF EXISTS idx_media_user_id;
DROP INDEX IF EXISTS idx_media_created_at;

-- Drop media table
DROP TABLE IF EXISTS media;
