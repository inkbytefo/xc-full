-- 000003_init_posts.down.sql
-- Rollback posts and reactions tables

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;

DROP TABLE IF EXISTS reactions;
DROP TABLE IF EXISTS posts;
