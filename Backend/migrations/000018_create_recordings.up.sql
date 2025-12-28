CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id TEXT NOT NULL REFERENCES streams(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    file_path TEXT NOT NULL,
    duration TEXT, -- Storing as string or interval
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recordings_stream_id ON recordings(stream_id);
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
