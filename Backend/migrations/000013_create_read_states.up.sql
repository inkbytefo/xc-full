CREATE TABLE IF NOT EXISTS read_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    last_read_message_id VARCHAR,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_read_states_user_id ON read_states(user_id);
CREATE INDEX idx_read_states_channel_id ON read_states(channel_id);
