-- ============================================================================
-- Migration: 000009_follows_and_wall_posts (DOWN)
-- Description: Rollback follows and server wall posts tables
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_wall_posts_created_at;
DROP INDEX IF EXISTS idx_wall_posts_author_id;
DROP INDEX IF EXISTS idx_wall_posts_server_id;

DROP INDEX IF EXISTS idx_follows_created_at;
DROP INDEX IF EXISTS idx_follows_followed_id;
DROP INDEX IF EXISTS idx_follows_follower_id;

-- Drop tables
DROP TABLE IF EXISTS server_wall_posts;
DROP TABLE IF EXISTS follows;
