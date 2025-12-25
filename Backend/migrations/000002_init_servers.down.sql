-- 000002_init_servers.down.sql
-- Rollback servers, channels, roles, permissions, and members tables (RBAC 2.0)

DROP TRIGGER IF EXISTS update_channel_messages_updated_at ON channel_messages;
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_servers_updated_at ON servers;

DROP TABLE IF EXISTS channel_messages;
DROP TABLE IF EXISTS permission_overwrites;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS member_roles;
DROP TABLE IF EXISTS server_members;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS servers;
