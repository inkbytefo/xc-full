-- 000001_init_users.up.sql
-- Initial users table and related tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id              VARCHAR(26) PRIMARY KEY,
    handle          VARCHAR(20) UNIQUE NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar_gradient TEXT[] NOT NULL DEFAULT ARRAY['#ff6b6b', '#4ecdc4'],
    bio             TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}'::jsonb,
    -- Denormalized counters for performance (Instagram-style)
    followers_count INT NOT NULL DEFAULT 0,
    following_count INT NOT NULL DEFAULT 0,
    posts_count     INT NOT NULL DEFAULT 0,
    --
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT handle_format CHECK (handle ~ '^[a-z0-9_]{3,20}$'),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT counters_non_negative CHECK (followers_count >= 0 AND following_count >= 0 AND posts_count >= 0)
);

-- User sessions table (for refresh tokens)
CREATE TABLE user_sessions (
    id              VARCHAR(26) PRIMARY KEY,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL UNIQUE,
    device_info     JSONB,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_metadata ON users USING gin (metadata);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
