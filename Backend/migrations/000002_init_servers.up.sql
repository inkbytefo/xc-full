-- 000002_init_servers.up.sql
-- Servers, channels, roles, permissions, and members tables (RBAC 2.0)

-- ============================================================================
-- SERVERS TABLE
-- ============================================================================
CREATE TABLE servers (
    id              VARCHAR(26) PRIMARY KEY,
    handle          VARCHAR(32) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon_gradient   TEXT[] NOT NULL DEFAULT ARRAY['#667eea', '#764ba2'],
    owner_id        VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_count    INTEGER NOT NULL DEFAULT 1,
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_server_handle UNIQUE (handle),
    CONSTRAINT server_handle_length CHECK (char_length(handle) >= 3 AND char_length(handle) <= 32),
    CONSTRAINT server_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

CREATE UNIQUE INDEX idx_servers_handle ON servers(handle);

-- ============================================================================
-- ROLES TABLE (RBAC 2.0)
-- Bitwise permissions stored as BIGINT for 64 permission flags
-- ============================================================================
CREATE TABLE roles (
    id              VARCHAR(26) PRIMARY KEY,
    server_id       VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7) DEFAULT '#99AAB5', -- Hex color
    position        INTEGER NOT NULL DEFAULT 0,    -- For hierarchy (higher = more powerful)
    permissions     BIGINT NOT NULL DEFAULT 0,     -- Bitwise permission flags
    is_default      BOOLEAN NOT NULL DEFAULT FALSE, -- @everyone role
    is_mentionable  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_role_name_per_server UNIQUE (server_id, name),
    CONSTRAINT role_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- ============================================================================
-- SERVER MEMBERS TABLE (Updated for RBAC 2.0)
-- ============================================================================
CREATE TABLE server_members (
    id          VARCHAR(26) PRIMARY KEY,
    server_id   VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id     VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname    VARCHAR(32),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    communication_disabled_until TIMESTAMPTZ, -- Timeout/mute until this time
    
    CONSTRAINT unique_server_member UNIQUE (server_id, user_id)
);

-- ============================================================================
-- MEMBER ROLES (Junction Table)
-- A member can have multiple roles
-- ============================================================================
CREATE TABLE member_roles (
    member_id   VARCHAR(26) NOT NULL REFERENCES server_members(id) ON DELETE CASCADE,
    role_id     VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, role_id)
);

-- ============================================================================
-- CHANNELS TABLE (Unified: Text + Voice + Video + Hybrid)
-- Supports all channel types in a single table
-- ============================================================================
CREATE TABLE channels (
    id          VARCHAR(26) PRIMARY KEY,
    server_id   VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    parent_id   VARCHAR(26) REFERENCES channels(id) ON DELETE SET NULL, -- Category parent
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    type        VARCHAR(20) NOT NULL DEFAULT 'text',
    position    INTEGER NOT NULL DEFAULT 0,
    is_private  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Voice/Video capabilities
    user_limit  INTEGER NOT NULL DEFAULT 0,      -- 0 = unlimited
    bitrate     INTEGER NOT NULL DEFAULT 64,     -- Audio bitrate in kbps
    livekit_room VARCHAR(100),                   -- LiveKit room name for voice/video
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT channel_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT valid_channel_type CHECK (type IN ('text', 'voice', 'video', 'announcement', 'category', 'stage', 'hybrid'))
);

-- ============================================================================
-- PERMISSION OVERWRITES TABLE
-- Allows overriding permissions for specific roles or users on a channel/category
-- ============================================================================
CREATE TABLE permission_overwrites (
    id          VARCHAR(26) PRIMARY KEY,
    channel_id  VARCHAR(26) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL, -- 'role' or 'member'
    target_id   VARCHAR(26) NOT NULL, -- role_id or member_id
    allow       BIGINT NOT NULL DEFAULT 0, -- Bitwise: explicitly allowed permissions
    deny        BIGINT NOT NULL DEFAULT 0, -- Bitwise: explicitly denied permissions
    
    CONSTRAINT valid_target_type CHECK (target_type IN ('role', 'member')),
    CONSTRAINT unique_overwrite UNIQUE (channel_id, target_type, target_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_servers_owner_id ON servers(owner_id);
CREATE INDEX idx_servers_is_public ON servers(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_servers_created_at ON servers(created_at DESC);

CREATE INDEX idx_roles_server_id ON roles(server_id);
CREATE INDEX idx_roles_position ON roles(server_id, position DESC);
CREATE INDEX idx_roles_is_default ON roles(server_id) WHERE is_default = TRUE;

CREATE INDEX idx_server_members_server_id ON server_members(server_id);
CREATE INDEX idx_server_members_user_id ON server_members(user_id);

CREATE INDEX idx_member_roles_member_id ON member_roles(member_id);
CREATE INDEX idx_member_roles_role_id ON member_roles(role_id);

CREATE INDEX idx_channels_server_id ON channels(server_id);
CREATE INDEX idx_channels_parent_id ON channels(parent_id);
CREATE INDEX idx_channels_position ON channels(server_id, position);
CREATE UNIQUE INDEX idx_channels_livekit_room ON channels(livekit_room) WHERE livekit_room IS NOT NULL;
CREATE INDEX idx_channels_voice_enabled ON channels(server_id, type) WHERE type IN ('voice', 'video', 'stage', 'hybrid');

CREATE INDEX idx_permission_overwrites_channel_id ON permission_overwrites(channel_id);
CREATE INDEX idx_permission_overwrites_target ON permission_overwrites(target_type, target_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_servers_updated_at
    BEFORE UPDATE ON servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

