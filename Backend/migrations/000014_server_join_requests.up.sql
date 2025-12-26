CREATE TABLE IF NOT EXISTS server_join_requests (
    server_id VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id),
    CONSTRAINT server_join_requests_valid_status CHECK(status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_server_join_requests_pending ON server_join_requests(server_id, created_at DESC) WHERE status = 'pending';
