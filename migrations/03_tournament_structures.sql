-- ============================================================
-- SQL Migration: 03_tournament_structures.sql
-- Creates Tournament structure, stages, matches sequencing, and 
-- teams seeding lerdgers.
-- ============================================================

-- 1. Create Tournaments table (if not exists, normalized from matches)
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  region TEXT,
  entry_fee NUMERIC DEFAULT 0,
  prize_pool NUMERIC DEFAULT 0,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD', -- INR, USD, Diamonds, etc.
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Tournament Stages table (League, Semi-Finals, Finals, Play-ins)
CREATE TABLE IF NOT EXISTS tournament_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  stage_order INT NOT NULL CHECK (stage_order >= 1),
  ruleset JSONB DEFAULT '{}'::jsonb, -- dynamic points configurations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, stage_order)
);

-- 3. Create Tournament Teams Seeding & Seeding progression Ledger
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,           -- Nullable for external guest rosters
  external_team_name TEXT,                                        -- Custom snapshot tag for external teams
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'eliminated', 'qualified')),
  qualification_seed INT,                                         -- Seeding number order
  advancement_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id),
  CONSTRAINT chk_team_source CHECK (team_id IS NOT NULL OR external_team_name IS NOT NULL)
);

-- 4. Create Stage Matches sequencing table (Tracks sequence of maps played)
CREATE TABLE IF NOT EXISTS stage_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES tournament_stages(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  match_order INT NOT NULL CHECK (match_order >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stage_id, match_order)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_matches ENABLE ROW LEVEL SECURITY;

-- Dynamic Read access (Teammates can select any tournament details)
CREATE POLICY tournaments_read ON tournaments FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY stages_read ON tournament_stages FOR SELECT
  USING (tournament_id IN (SELECT id FROM tournaments WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

CREATE POLICY tour_teams_read ON tournament_teams FOR SELECT
  USING (tournament_id IN (SELECT id FROM tournaments WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

CREATE POLICY stage_matches_read ON stage_matches FOR SELECT
  USING (stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id IN (SELECT id FROM tournaments WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));
