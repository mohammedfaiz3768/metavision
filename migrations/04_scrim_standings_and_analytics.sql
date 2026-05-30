-- ============================================================
-- SQL Migration: 04_scrim_standings_and_analytics.sql
-- Creates row-based 12-team scrim standings, analytical snapshots, 
-- and dirty invalidation ledger.
-- ============================================================

-- 1. Create Scrim Round Teams table (Lobby Standings: up to 12 squads)
CREATE TABLE IF NOT EXISTS scrim_round_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES scrim_rounds(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,          -- Null for external opponent squads
  team_name TEXT NOT NULL,                                        -- Historical snapshot name
  placement INT CHECK (placement BETWEEN 1 AND 48),
  kills INT DEFAULT 0,
  damage INT DEFAULT 0,
  prize_won NUMERIC DEFAULT 0,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, team_name)
);

-- Index for speedy round standings fetches
CREATE INDEX IF NOT EXISTS idx_scrim_round_teams_round ON scrim_round_teams(round_id);

-- 2. Create Hybrid Analytics Snapshots table (Aggregates)
CREATE TABLE IF NOT EXISTS team_analytics_snapshots (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE PRIMARY KEY,
  rivals_json JSONB DEFAULT '{}'::jsonb,      -- Summarized aggregates for rival teams
  roi_json JSONB DEFAULT '{}'::jsonb,         -- Summarized aggregations for cash flows
  progression_json JSONB DEFAULT '{}'::jsonb,  -- Summarized placements & timeline progression
  tournaments_json JSONB DEFAULT '{}'::jsonb, -- Summarized stage advancement statistics
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Deduplicated Analytics dirty-flag index table
CREATE TABLE IF NOT EXISTS dirty_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('rivals', 'roi', 'progression', 'tournaments')),
  needs_recalc BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, metric_type)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE scrim_round_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dirty_analytics ENABLE ROW LEVEL SECURITY;

-- Dynamic Select Rights
CREATE POLICY round_teams_read ON scrim_round_teams FOR SELECT
  USING (round_id IN (SELECT id FROM scrim_rounds WHERE session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));

CREATE POLICY snapshots_read ON team_analytics_snapshots FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY dirty_read ON dirty_analytics FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
