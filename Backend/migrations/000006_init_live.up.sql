-- 000006_init_live.up.sql
-- Live streaming tables

-- Categories table
CREATE TABLE stream_categories (
    id              VARCHAR(26) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        TEXT,
    stream_count    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Streams table
CREATE TABLE streams (
    id              VARCHAR(26) PRIMARY KEY,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(100) NOT NULL,
    description     TEXT,
    category_id     VARCHAR(26) REFERENCES stream_categories(id) ON DELETE SET NULL,
    thumbnail_url   TEXT,
    stream_key      VARCHAR(64) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'offline',
    viewer_count    INTEGER NOT NULL DEFAULT 0,
    is_nsfw         BOOLEAN NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT stream_title_length CHECK (char_length(title) >= 3),
    CONSTRAINT stream_status_valid CHECK (status IN ('offline', 'live', 'ending'))
);

-- Stream viewers table (for real-time tracking)
CREATE TABLE stream_viewers (
    stream_id       VARCHAR(26) NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (stream_id, user_id)
);

-- Indexes
CREATE INDEX idx_streams_user_id ON streams(user_id);
CREATE INDEX idx_streams_category_id ON streams(category_id);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_live ON streams(status, viewer_count DESC) WHERE status = 'live';
CREATE INDEX idx_streams_stream_key ON streams(stream_key);
CREATE INDEX idx_stream_viewers_user ON stream_viewers(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_streams_updated_at
    BEFORE UPDATE ON streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO stream_categories (id, name, slug, description) VALUES
    ('cat_gaming', 'Gaming', 'gaming', 'Video game streaming'),
    ('cat_music', 'Music', 'music', 'Live music performances'),
    ('cat_just_chatting', 'Just Chatting', 'just-chatting', 'Chat with your audience'),
    ('cat_art', 'Art', 'art', 'Creative art streams'),
    ('cat_technology', 'Technology', 'technology', 'Tech and coding streams'),
    ('cat_sports', 'Sports', 'sports', 'Sports and fitness'),
    ('cat_education', 'Education', 'education', 'Learning and tutorials');
