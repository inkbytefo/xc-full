-- 000015_moderation_system.up.sql

-- ============================================================================
-- SERVER BANS TABLE
-- ============================================================================
CREATE TABLE server_bans (
    id          VARCHAR(26) PRIMARY KEY, -- Unique ID for the ban record
    server_id   VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id     VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by   VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_server_ban UNIQUE (server_id, user_id)
);

CREATE INDEX idx_server_bans_server_id ON server_bans(server_id);
CREATE INDEX idx_server_bans_user_id ON server_bans(user_id);

CREATE TRIGGER update_server_bans_updated_at
    BEFORE UPDATE ON server_bans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
    id          VARCHAR(26) PRIMARY KEY,
    server_id   VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    actor_id    VARCHAR(26) REFERENCES users(id) ON DELETE SET NULL, -- Who performed the action
    target_id   VARCHAR(26), -- ID of the affected entity (user_id, channel_id, etc.)
    action_type VARCHAR(50) NOT NULL, -- e.g., 'MEMBER_BAN_ADD', 'CHANNEL_CREATE'
    changes     JSONB, -- Stores before/after values or details
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_server_id ON audit_logs(server_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- TIMEOUTS (Add to server_members)
-- ============================================================================
ALTER TABLE server_members
ADD COLUMN communication_disabled_until TIMESTAMPTZ;
