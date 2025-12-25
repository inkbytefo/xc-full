-- Remove avatar_url and banner_url columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS avatar_url,
DROP COLUMN IF EXISTS banner_url;
