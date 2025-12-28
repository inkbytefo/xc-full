-- Migration: 000019_create_hashtags
-- Description: Add hashtags and relationship tables for posts and wall posts

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
    id VARCHAR(26) PRIMARY KEY,
    tag VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching tags
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);

-- Post hashtags (User Posts)
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id VARCHAR(26) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id VARCHAR(26) NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, hashtag_id)
);

-- Index for searching posts by tag
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);

-- Wall Post hashtags (Server Wall Posts)
CREATE TABLE IF NOT EXISTS wall_post_hashtags (
    post_id VARCHAR(26) NOT NULL REFERENCES server_wall_posts(id) ON DELETE CASCADE,
    hashtag_id VARCHAR(26) NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, hashtag_id)
);

-- Index for searching wall posts by tag
CREATE INDEX IF NOT EXISTS idx_wall_post_hashtags_hashtag_id ON wall_post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_wall_post_hashtags_post_id ON wall_post_hashtags(post_id);
