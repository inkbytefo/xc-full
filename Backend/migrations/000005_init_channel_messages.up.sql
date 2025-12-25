-- 000005_init_channel_messages.up.sql
-- Channel messages table

CREATE TABLE channel_messages (
    id              VARCHAR(26) PRIMARY KEY,
    channel_id      VARCHAR(26) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    server_id       VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    author_id       VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    reply_to_id     VARCHAR(26) REFERENCES channel_messages(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT channel_message_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Indexes for channel messages
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX idx_channel_messages_server_id ON channel_messages(server_id);
CREATE INDEX idx_channel_messages_author_id ON channel_messages(author_id);
CREATE INDEX idx_channel_messages_created_at ON channel_messages(channel_id, created_at DESC);
CREATE INDEX idx_channel_messages_pinned ON channel_messages(channel_id, is_pinned) WHERE is_pinned = TRUE;

-- Full-text search index for message content
CREATE INDEX idx_channel_messages_content_search ON channel_messages USING gin(to_tsvector('english', content));

-- Trigger for updated_at
CREATE TRIGGER update_channel_messages_updated_at
    BEFORE UPDATE ON channel_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
