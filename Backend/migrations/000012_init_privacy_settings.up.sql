-- 000012_init_privacy_settings.up.sql
-- Privacy settings table for user privacy preferences

CREATE TABLE privacy_settings (
    user_id                     VARCHAR(26) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Online Status Visibility: 'everyone', 'friends', 'nobody'
    online_status_visibility    VARCHAR(20) NOT NULL DEFAULT 'everyone',
    
    -- DM Permissions: 'everyone', 'friends', 'server_members', 'nobody'
    dm_permission               VARCHAR(20) NOT NULL DEFAULT 'everyone',
    
    -- Profile Visibility: 'public', 'friends', 'private'
    profile_visibility          VARCHAR(20) NOT NULL DEFAULT 'public',
    
    -- Activity Status: show what you're playing/listening
    show_activity              BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Read Receipts: show when you've read messages
    read_receipts_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Typing Indicators: show "typing..." status
    typing_indicators_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Friend Request Permission: 'everyone', 'friends_of_friends', 'nobody'
    friend_request_permission  VARCHAR(20) NOT NULL DEFAULT 'everyone',
    
    -- Show Server Tags: display server role tags on profile
    show_server_tags           BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamps
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT online_status_valid CHECK (online_status_visibility IN ('everyone', 'friends', 'nobody')),
    CONSTRAINT dm_permission_valid CHECK (dm_permission IN ('everyone', 'friends', 'server_members', 'nobody')),
    CONSTRAINT profile_visibility_valid CHECK (profile_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT friend_request_valid CHECK (friend_request_permission IN ('everyone', 'friends_of_friends', 'nobody'))
);

-- Trigger for updated_at
CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_privacy_settings_user_id ON privacy_settings(user_id);
