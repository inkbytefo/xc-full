-- 000003_init_posts.up.sql
-- Posts and reactions tables

-- Posts table
CREATE TABLE posts (
    id              VARCHAR(26) PRIMARY KEY,
    author_id       VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    visibility      VARCHAR(20) NOT NULL DEFAULT 'public',
    server_id       VARCHAR(26) REFERENCES servers(id) ON DELETE CASCADE,
    reply_to_id     VARCHAR(26) REFERENCES posts(id) ON DELETE SET NULL,
    repost_of_id    VARCHAR(26) REFERENCES posts(id) ON DELETE SET NULL,
    media_urls      TEXT[] DEFAULT ARRAY[]::TEXT[],
    like_count      INTEGER NOT NULL DEFAULT 0,
    repost_count    INTEGER NOT NULL DEFAULT 0,
    reply_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT post_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
    CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'friends', 'server'))
);

-- Reactions table (likes, reposts, bookmarks)
CREATE TABLE reactions (
    id          VARCHAR(26) PRIMARY KEY,
    post_id     VARCHAR(26) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_reaction UNIQUE (post_id, user_id, type),
    CONSTRAINT valid_reaction_type CHECK (type IN ('like', 'repost', 'bookmark'))
);

-- Indexes for posts
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_server_id ON posts(server_id) WHERE server_id IS NOT NULL;
CREATE INDEX idx_posts_reply_to ON posts(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_posts_feed ON posts(visibility, created_at DESC) WHERE visibility = 'public';

-- Indexes for reactions
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_reactions_type ON reactions(post_id, type);
CREATE INDEX idx_reactions_user_post ON reactions(user_id, post_id);

-- Trigger for updated_at
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
