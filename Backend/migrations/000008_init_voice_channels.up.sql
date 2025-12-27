-- 000008_init_voice_channels.up.sql
-- Voice participants table (tracks who is in which voice channel)

-- Voice participants table (current state - who is in which channel)
CREATE TABLE voice_participants (
    user_id         VARCHAR(26) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    channel_id      VARCHAR(26) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
    is_deafened     BOOLEAN NOT NULL DEFAULT FALSE,
    is_video_on     BOOLEAN NOT NULL DEFAULT FALSE,
    is_screening    BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_participants_channel ON voice_participants(channel_id);
