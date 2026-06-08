-- ============================================================
-- SQL Migration: 08_building_callouts.sql
-- Creates building_callouts table and sets up team isolation RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS building_callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  map_id TEXT NOT NULL,
  building_id TEXT NOT NULL,
  callout_text TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_team_map_building UNIQUE (team_id, map_id, building_id)
);

-- Index for fast lookup on map loading
CREATE INDEX IF NOT EXISTS idx_building_callouts_team_map 
ON building_callouts(team_id, map_id);

-- Enable Row Level Security (RLS)
ALTER TABLE building_callouts ENABLE ROW LEVEL SECURITY;

-- 1. Select Policy: Any member of the team can view the callouts
CREATE POLICY callouts_select ON building_callouts 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = building_callouts.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- 2. Write Policy: Only team members with coach, analyst, or IGL roles can insert/update/delete callouts
CREATE POLICY callouts_write ON building_callouts 
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = building_callouts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('coach', 'analyst', 'IGL')
    )
  );
