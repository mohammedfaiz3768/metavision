-- ============================================================
-- SQL Migration: 05_phase4_new_features.sql
-- Overhauls Scrims, Tournaments, Owner Dashboards, and Analysis Boards.
-- ============================================================

-- 1. Update profiles check constraint to support owner roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('player','coach','analyst','admin','owner','co_owner'));

-- 2. Drop old Scrim and Tournaments system tables
DROP TABLE IF EXISTS scrim_round_players CASCADE;
DROP TABLE IF EXISTS scrim_rounds CASCADE;
DROP TABLE IF EXISTS scrim_sessions CASCADE;
DROP TABLE IF EXISTS tournament_matches CASCADE;
DROP TABLE IF EXISTS tournament_stages CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;

-- 3. Rebuild Scrim Sessions
CREATE TABLE scrim_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  map TEXT NOT NULL CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  total_rounds INT NOT NULL CHECK (total_rounds IN (3,6)),
  entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  prize_pool_received NUMERIC(10,2) DEFAULT NULL,
  overall_standing INT CHECK (overall_standing BETWEEN 1 AND 12),
  above_team_points INT DEFAULT NULL,
  below_team_points INT DEFAULT NULL,
  first_place_points INT DEFAULT NULL,
  total_scrim_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rebuild Scrim Rounds
CREATE TABLE scrim_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES scrim_sessions(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL CHECK (round_number BETWEEN 1 AND 6),
  placement INT NOT NULL CHECK (placement BETWEEN 1 AND 12),
  kills INT NOT NULL DEFAULT 0,
  placement_points INT NOT NULL,
  kill_points INT NOT NULL,
  total_round_points INT NOT NULL
);

-- 5. Rebuild Tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('official','unofficial')),
  prize_pool_type TEXT NOT NULL CHECK (prize_pool_type IN ('top3','top5','top12')),
  start_date DATE,
  final_position INT DEFAULT NULL,
  prize_received NUMERIC(10,2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Rebuild Tournament Stages
CREATE TABLE tournament_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Rebuild Tournament Matches
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES tournament_stages(id) ON DELETE CASCADE NOT NULL,
  match_name TEXT NOT NULL,
  map TEXT NOT NULL CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  placement INT CHECK (placement BETWEEN 1 AND 12),
  kills INT DEFAULT 0,
  placement_points INT DEFAULT 0,
  kill_points INT DEFAULT 0,
  total_match_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Owner Team Members
CREATE TABLE owner_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','co_owner','analyst','coach')),
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Analysis Tournaments
CREATE TABLE analysis_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Analysis Stages
CREATE TABLE analysis_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES analysis_tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  stage_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Analysis Matches
CREATE TABLE analysis_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES analysis_stages(id) ON DELETE CASCADE NOT NULL,
  match_name TEXT NOT NULL,
  map TEXT NOT NULL CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  canvas_data JSONB DEFAULT '{}'::jsonb,
  team_logos JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Team Logo Uploads
CREATE TABLE team_logo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_tournament_id UUID REFERENCES analysis_tournaments(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  slot_number INT NOT NULL CHECK (slot_number BETWEEN 1 AND 12),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enablements
ALTER TABLE scrim_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_logo_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY scrim_sessions_team ON scrim_sessions FOR ALL USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY scrim_rounds_team ON scrim_rounds FOR ALL USING (session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY tournaments_team ON tournaments FOR ALL USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY tournament_stages_team ON tournament_stages FOR ALL USING (tournament_id IN (SELECT id FROM tournaments WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY tournament_matches_team ON tournament_matches FOR ALL USING (stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id IN (SELECT id FROM tournaments WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));
CREATE POLICY owner_team_read ON owner_team_members FOR SELECT USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','co_owner')));
CREATE POLICY owner_team_insert ON owner_team_members FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','co_owner')));
CREATE POLICY owner_team_update ON owner_team_members FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','co_owner')));
CREATE POLICY owner_team_delete ON owner_team_members FOR DELETE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','co_owner')));

CREATE POLICY analysis_tournaments_owner_insert ON analysis_tournaments FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_tournaments_owner_update ON analysis_tournaments FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_tournaments_owner_delete ON analysis_tournaments FOR DELETE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_tournaments_public_read ON analysis_tournaments FOR SELECT USING (is_published = TRUE OR auth.uid() IN (SELECT user_id FROM owner_team_members));

CREATE POLICY analysis_stages_owner_insert ON analysis_stages FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_stages_owner_update ON analysis_stages FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_stages_owner_delete ON analysis_stages FOR DELETE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_stages_read ON analysis_stages FOR SELECT USING (tournament_id IN (SELECT id FROM analysis_tournaments WHERE is_published = TRUE) OR auth.uid() IN (SELECT user_id FROM owner_team_members));

CREATE POLICY analysis_matches_owner_insert ON analysis_matches FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_matches_owner_update ON analysis_matches FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_matches_owner_delete ON analysis_matches FOR DELETE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY analysis_matches_read ON analysis_matches FOR SELECT USING (stage_id IN (SELECT id FROM analysis_stages WHERE tournament_id IN (SELECT id FROM analysis_tournaments WHERE is_published = TRUE)) OR auth.uid() IN (SELECT user_id FROM owner_team_members));

CREATE POLICY team_logos_owner_insert ON team_logo_uploads FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY team_logos_owner_update ON team_logo_uploads FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY team_logos_owner_delete ON team_logo_uploads FOR DELETE USING (auth.uid() IN (SELECT user_id FROM owner_team_members));
CREATE POLICY team_logos_read ON team_logo_uploads FOR SELECT USING (TRUE);
