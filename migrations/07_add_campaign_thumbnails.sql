-- ============================================================
-- SQL Migration: 07_add_campaign_thumbnails.sql
-- Adds thumbnail_url to analysis_tournaments for custom campaigns banners.
-- ============================================================

ALTER TABLE analysis_tournaments ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;
