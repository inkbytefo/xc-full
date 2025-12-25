-- 000007_init_notifications.up.sql
-- Notifications tables

-- Notifications table
CREATE TABLE notifications (
    id              VARCHAR(26) PRIMARY KEY,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL,
    actor_id        VARCHAR(26) REFERENCES users(id) ON DELETE SET NULL,
    target_type     VARCHAR(30),
    target_id       VARCHAR(26),
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT notification_type_valid CHECK (type IN (
        'follow', 'like', 'repost', 'reply', 'mention', 
        'dm', 'server_invite', 'server_join', 'stream_live', 'system'
    ))
);

-- Notification preferences table
CREATE TABLE notification_preferences (
    user_id          VARCHAR(26) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    dm_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    mention_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    follow_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    like_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    repost_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    reply_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    stream_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(user_id, type);

-- Trigger for preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
