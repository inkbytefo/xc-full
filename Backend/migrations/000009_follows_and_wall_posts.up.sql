-- ============================================================================
-- Migration: 000009_follows_and_wall_posts
-- Description: Add follows table and server wall posts table
-- ============================================================================

-- Follows table: User follow relationships with status
CREATE TABLE IF NOT EXISTS follows (
    id VARCHAR(26) PRIMARY KEY,
    follower_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'blocked'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT follows_unique UNIQUE(follower_id, followed_id),
    CONSTRAINT follows_no_self_follow CHECK(follower_id != followed_id),
    CONSTRAINT follows_valid_status CHECK(status IN ('active', 'pending', 'blocked'))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_pending ON follows(followed_id, status) WHERE status = 'pending';

-- Server wall posts table: Posts on server profile wall
CREATE TABLE IF NOT EXISTS server_wall_posts (
    id VARCHAR(26) PRIMARY KEY,
    server_id VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    author_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(content) > 0 AND length(content) <= 2000),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for server wall posts
CREATE INDEX IF NOT EXISTS idx_wall_posts_server_id ON server_wall_posts(server_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_author_id ON server_wall_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_created_at ON server_wall_posts(server_id, is_pinned DESC, created_at DESC);
