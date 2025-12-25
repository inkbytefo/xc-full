-- Add avatar_url and banner_url columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT '',
ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500) DEFAULT '';

-- Add index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url != '';
