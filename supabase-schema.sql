-- ============================================================
-- FF Intel — Complete Database Schema
-- Run this in Supabase SQL Editor in one go
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  full_name TEXT,
  age INT CHECK (age BETWEEN 10 AND 60),
  in_game_name TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  show_team_on_profile BOOLEAN DEFAULT TRUE,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('IGL','entry','support','sniper','coach','analyst','player')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. Strategy Boards (with thumbnail + soft delete)
CREATE TABLE strategy_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  map TEXT NOT NULL CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  canvas_data JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  public_token TEXT UNIQUE DEFAULT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Matches (with soft delete)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  map TEXT CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  placement INT CHECK (placement BETWEEN 1 AND 48),
  total_kills INT DEFAULT 0,
  screenshot_url TEXT,
  ocr_data JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT DEFAULT NULL,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Match Players
CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  kills INT DEFAULT 0,
  damage INT DEFAULT 0,
  survived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Events (heatmap data, normalized 0-1 coordinates, with client deduplication and schema versioning)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id UUID UNIQUE, -- Client-side generated UUID for robust idempotency
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('knock','death','rotation','fight','revive','utility','vehicle')),
  x FLOAT NOT NULL CHECK (x BETWEEN 0 AND 1),
  y FLOAT NOT NULL CHECK (y BETWEEN 0 AND 1),
  player_name TEXT,
  timestamp_ms INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  schema_version INT DEFAULT 1, -- Versioning events schema for clean future migrations
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Rival Profiles (must exist before scrim_sessions references it)
CREATE TABLE rival_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tag TEXT,                                     -- clan tag e.g. "[OMG]"
  region TEXT,
  preferred_maps TEXT[],                        -- known map preferences (acceptable for Phase 3)
  landing_spots JSONB DEFAULT '[]'::jsonb,      -- structured tactical intel: [{map, poi, confidence}]
  playstyle_notes TEXT,                         -- aggro/passive/rotator free-text
  threat_level TEXT DEFAULT 'medium' CHECK (threat_level IN ('low','medium','high','elite')),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

-- 9. Scrim Sessions (expanded from Phase 1 placeholder)
CREATE TABLE scrim_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  rival_id UUID REFERENCES rival_profiles(id) ON DELETE SET NULL,
  opponent_name TEXT NOT NULL,                  -- denormalized from rival or manual entry
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes TEXT,
  session_date DATE DEFAULT CURRENT_DATE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Scrim Rounds (individual games within a session, max 12)
CREATE TABLE scrim_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES scrim_sessions(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL CHECK (round_number BETWEEN 1 AND 12),
  map TEXT CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')),
  placement INT CHECK (placement BETWEEN 1 AND 48),
  total_kills INT DEFAULT 0,
  opponent_kills INT DEFAULT 0,                 -- opponent squad kills if known
  opponent_placement INT,                       -- opponent placement if known
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,           -- escape hatch for rival adaptation tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, round_number)
);

-- 11. Scrim Round Players (per-player stats per round)
CREATE TABLE scrim_round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES scrim_rounds(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable for roster changes
  player_name TEXT NOT NULL,                    -- snapshot fallback for historical integrity
  kills INT DEFAULT 0,
  damage INT DEFAULT 0,
  survived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, player_name)
);

-- 9. AI Reviews (caching and lock system)
CREATE TABLE ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('generating', 'complete')),
  source_hash TEXT, -- Stale cache detection
  generation_started_at TIMESTAMPTZ DEFAULT NOW(), -- Deadlock timeout reset
  generation_duration_ms INT, -- Performance and cost metrics
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id)
);

-- 10. Team Invites (link-based, no email)
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_uses INT DEFAULT 1,
  uses INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rival_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY profiles_own ON profiles FOR ALL USING (id = auth.uid());

-- Teams: anyone can read team profiles
CREATE POLICY teams_read ON teams FOR SELECT USING (true);

-- Teams: owners can insert (for team creation, owner_id matches auth.uid)
CREATE POLICY teams_owner_insert ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Teams: owners can update/delete
CREATE POLICY teams_owner_write ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY teams_owner_delete ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team members: can read other members of their teams, and always read their own membership
CREATE POLICY team_members_read ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members: owners can manage members
CREATE POLICY team_members_owner_write ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY team_members_owner_update ON team_members FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

CREATE POLICY team_members_owner_delete ON team_members FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

-- Strategy boards: team members can read (+ public boards anyone can read)
CREATE POLICY boards_team_read ON strategy_boards FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR is_public = TRUE
  );

-- Strategy boards: all team members can update canvas_data
CREATE POLICY boards_member_update ON strategy_boards FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Strategy boards: only coach/IGL/analyst can create boards
CREATE POLICY boards_admin_insert ON strategy_boards FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('coach','IGL','analyst')
    )
  );

-- Strategy boards: only coach/IGL/analyst can delete boards
CREATE POLICY boards_admin_delete ON strategy_boards FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('coach','IGL','analyst')
    )
  );

-- Matches
CREATE POLICY matches_team_read ON matches FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY matches_team_write ON matches FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY matches_team_update ON matches FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Match players
CREATE POLICY match_players_read ON match_players FOR SELECT
  USING (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY match_players_write ON match_players FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

-- Events
CREATE POLICY events_team_read ON events FOR SELECT
  USING (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY events_team_write ON events FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

-- Scrim sessions
CREATE POLICY scrims_team_read ON scrim_sessions FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY scrims_team_write ON scrim_sessions FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY scrims_team_update ON scrim_sessions FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY scrims_team_delete ON scrim_sessions FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Scrim rounds: inherit access through session → team
CREATE POLICY scrim_rounds_read ON scrim_rounds FOR SELECT
  USING (session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY scrim_rounds_write ON scrim_rounds FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY scrim_rounds_update ON scrim_rounds FOR UPDATE
  USING (session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));
CREATE POLICY scrim_rounds_delete ON scrim_rounds FOR DELETE
  USING (session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

-- Scrim round players: inherit access through round → session → team
CREATE POLICY scrim_round_players_read ON scrim_round_players FOR SELECT
  USING (round_id IN (SELECT id FROM scrim_rounds WHERE session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));
CREATE POLICY scrim_round_players_write ON scrim_round_players FOR INSERT
  WITH CHECK (round_id IN (SELECT id FROM scrim_rounds WHERE session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));
CREATE POLICY scrim_round_players_delete ON scrim_round_players FOR DELETE
  USING (round_id IN (SELECT id FROM scrim_rounds WHERE session_id IN (SELECT id FROM scrim_sessions WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))));

-- Rival profiles: team-scoped CRUD
CREATE POLICY rivals_team_read ON rival_profiles FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY rivals_team_write ON rival_profiles FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY rivals_team_update ON rival_profiles FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY rivals_team_delete ON rival_profiles FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team invites: team members can read invites
CREATE POLICY invites_team_read ON team_invites FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team invites: owners can create/manage
CREATE POLICY invites_owner_write ON team_invites FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));
CREATE POLICY invites_owner_update ON team_invites FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));
CREATE POLICY invites_owner_delete ON team_invites FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

-- Public invite read (for /invite/[token] page — anyone with token can read)
CREATE POLICY invites_public_read ON team_invites FOR SELECT
  USING (true);

-- AI Reviews: members can read reviews of their team's matches
CREATE POLICY ai_reviews_select ON ai_reviews FOR SELECT
  USING (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

-- AI Reviews: members can write/update reviews of their team's matches
CREATE POLICY ai_reviews_insert ON ai_reviews FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));

CREATE POLICY ai_reviews_update ON ai_reviews FOR UPDATE
  USING (match_id IN (SELECT id FROM matches WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())));


-- ============================================================
-- PERFORMANCE & HEATMAP SEARCH INDEXES
-- ============================================================

-- FK performance indexes
CREATE INDEX IF NOT EXISTS idx_events_match_id ON events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_scrim_rounds_session ON scrim_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_scrim_round_players_round ON scrim_round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_scrim_sessions_team ON scrim_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_rival_profiles_team ON rival_profiles(team_id);

-- Partial indexes on soft-delete tables (critical for query perf at scale)
CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(team_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_active ON events(match_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boards_active ON strategy_boards(team_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scrim_sessions_active ON scrim_sessions(team_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rival_profiles_active ON rival_profiles(team_id) WHERE deleted_at IS NULL;


-- ============================================================
-- PROFILE CREATION TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 11. BUILDING CALLOUTS
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

CREATE INDEX IF NOT EXISTS idx_building_callouts_team_map ON building_callouts(team_id, map_id);

ALTER TABLE building_callouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY callouts_select ON building_callouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = building_callouts.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY callouts_write ON building_callouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = building_callouts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('coach', 'analyst', 'IGL')
    )
  );


-- ============================================================
-- 12. PHASE 5 FEATURES: VIDEO PLAYER & RECRUITMENT MARKETPLACE
-- ============================================================

CREATE TABLE IF NOT EXISTS match_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES match_videos(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  timestamp_seconds FLOAT NOT NULL,
  canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruitment_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('player_seeking_team', 'team_seeking_player')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruitment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES recruitment_posts(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT unique_post_applicant UNIQUE (post_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS recruitment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES recruitment_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

ALTER TABLE match_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_videos_select ON match_videos FOR SELECT USING (
  (team_id IS NULL AND uploaded_by = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = match_videos.team_id 
      AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY match_videos_insert ON match_videos FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND (
    team_id IS NULL OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = match_videos.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('coach', 'analyst', 'IGL')
    )
  )
);

CREATE POLICY video_annotations_select ON video_annotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM match_videos 
    WHERE match_videos.id = video_annotations.video_id
      AND (
        (match_videos.team_id IS NULL AND match_videos.uploaded_by = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.team_id = match_videos.team_id 
            AND team_members.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY video_annotations_modify ON video_annotations FOR ALL USING (
  created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM match_videos
    WHERE match_videos.id = video_annotations.video_id
      AND (
        match_videos.team_id IS NULL OR EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.team_id = match_videos.team_id 
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('coach', 'analyst', 'IGL')
        )
      )
  )
);

CREATE POLICY recruitment_posts_select ON recruitment_posts FOR SELECT USING (
  status = 'open' OR posted_by = auth.uid()
);

CREATE POLICY recruitment_posts_modify ON recruitment_posts FOR ALL USING (
  posted_by = auth.uid()
);

CREATE POLICY recruitment_threads_access ON recruitment_threads FOR ALL USING (
  applicant_id = auth.uid() OR post_owner_id = auth.uid()
);

CREATE POLICY recruitment_messages_select ON recruitment_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recruitment_threads 
    WHERE recruitment_threads.id = recruitment_messages.thread_id
      AND (recruitment_threads.applicant_id = auth.uid() OR recruitment_threads.post_owner_id = auth.uid())
  )
);

CREATE POLICY recruitment_messages_insert ON recruitment_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM recruitment_threads 
    WHERE recruitment_threads.id = recruitment_messages.thread_id
      AND recruitment_threads.is_active = TRUE
      AND (recruitment_threads.applicant_id = auth.uid() OR recruitment_threads.post_owner_id = auth.uid())
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('match-videos', 'match-videos', TRUE, 2684354560, ARRAY['video/mp4', 'video/webm']),
  ('profile-photos', 'profile-photos', TRUE, 3145728, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "match-videos-read" ON storage.objects FOR SELECT USING (bucket_id = 'match-videos');
CREATE POLICY "match-videos-upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'match-videos' AND auth.role() = 'authenticated'
);

CREATE POLICY "profile-photos-read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
CREATE POLICY "profile-photos-upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos' AND auth.role() = 'authenticated'
);

