-- 000001_init_users.down.sql
-- Rollback initial users table

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
