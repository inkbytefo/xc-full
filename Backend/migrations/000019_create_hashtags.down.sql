-- Revert Migration: 000019_create_hashtags

DROP TABLE IF EXISTS wall_post_hashtags;
DROP TABLE IF EXISTS post_hashtags;
DROP TABLE IF EXISTS hashtags;
