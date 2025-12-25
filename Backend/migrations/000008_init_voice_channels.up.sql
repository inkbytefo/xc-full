-- 000008_init_voice_channels.up.sql
-- Voice/Video channels tables

-- Voice channels table
CREATE TABLE voice_channels (
    id              VARCHAR(26) PRIMARY KEY,
    server_id       VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL DEFAULT 'voice',
    position        INTEGER NOT NULL DEFAULT 0,
    user_limit      INTEGER NOT NULL DEFAULT 0,
    bitrate         INTEGER NOT NULL DEFAULT 64,
    livekit_room    VARCHAR(100) UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT voice_channel_type_valid CHECK (type IN ('voice', 'video', 'stage')),
    CONSTRAINT voice_channel_name_length CHECK (char_length(name) >= 1)
);

-- Voice participants table (current state - who is in which channel)
CREATE TABLE voice_participants (
    user_id         VARCHAR(26) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    channel_id      VARCHAR(26) NOT NULL REFERENCES voice_channels(id) ON DELETE CASCADE,
    is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
    is_deafened     BOOLEAN NOT NULL DEFAULT FALSE,
    is_video_on     BOOLEAN NOT NULL DEFAULT FALSE,
    is_screening    BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_channels_server_id ON voice_channels(server_id);
CREATE INDEX idx_voice_channels_position ON voice_channels(server_id, position);
CREATE INDEX idx_voice_participants_channel ON voice_participants(channel_id);

-- Trigger for updated_at
CREATE TRIGGER update_voice_channels_updated_at
    BEFORE UPDATE ON voice_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
