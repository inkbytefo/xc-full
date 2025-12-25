-- 000004_init_dm.up.sql
-- Direct messaging tables

-- Conversations table
CREATE TABLE conversations (
    id              VARCHAR(26) PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
    id              VARCHAR(26) PRIMARY KEY,
    conversation_id VARCHAR(26) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at    TIMESTAMPTZ,
    
    CONSTRAINT unique_conversation_participant UNIQUE (conversation_id, user_id)
);

-- DM Messages table
CREATE TABLE dm_messages (
    id              VARCHAR(26) PRIMARY KEY,
    conversation_id VARCHAR(26) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT dm_message_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Last message reference in conversation
ALTER TABLE conversations ADD COLUMN last_message_id VARCHAR(26) REFERENCES dm_messages(id) ON DELETE SET NULL;

-- Indexes for conversations
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Indexes for participants
CREATE INDEX idx_conv_participants_conv_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_last_read ON conversation_participants(conversation_id, last_read_at);

-- Indexes for messages
CREATE INDEX idx_dm_messages_conv_id ON dm_messages(conversation_id);
CREATE INDEX idx_dm_messages_sender_id ON dm_messages(sender_id);
CREATE INDEX idx_dm_messages_created_at ON dm_messages(conversation_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dm_messages_updated_at
    BEFORE UPDATE ON dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
