-- ============================================================
-- SQL Migration: 09_phase5_features.sql
-- Description: Adds Player Profile extensions, Video Analysis, 
--              and Recruitment System tables with RLS and Storage.
-- ============================================================

-- 1. Extend profiles table with onboarding & bio fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INT CHECK (age BETWEEN 10 AND 60);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS in_game_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_team_on_profile BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;

-- 2. Create Match Videos table
CREATE TABLE IF NOT EXISTS match_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- Nullable for solo users/free agents
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL, -- Supabase Storage URL
  duration_seconds FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Video Annotations table
CREATE TABLE IF NOT EXISTS video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES match_videos(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  timestamp_seconds FLOAT NOT NULL,
  canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Serialized Konva drawings
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Recruitment Posts table
CREATE TABLE IF NOT EXISTS recruitment_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- Nullable (only filled when a team posts)
  post_type TEXT NOT NULL CHECK (post_type IN ('player_seeking_team', 'team_seeking_player')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of roles (e.g. ["Rusher", "Sniper"])
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Recruitment Threads table (1-to-1 applicant chat thread)
CREATE TABLE IF NOT EXISTS recruitment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES recruitment_posts(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT unique_post_applicant UNIQUE (post_id, applicant_id)
);

-- 6. Create Recruitment Messages table
CREATE TABLE IF NOT EXISTS recruitment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES recruitment_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE match_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent setup)
DROP POLICY IF EXISTS match_videos_select ON match_videos;
DROP POLICY IF EXISTS match_videos_insert ON match_videos;
DROP POLICY IF EXISTS video_annotations_select ON video_annotations;
DROP POLICY IF EXISTS video_annotations_modify ON video_annotations;
DROP POLICY IF EXISTS recruitment_posts_select ON recruitment_posts;
DROP POLICY IF EXISTS recruitment_posts_modify ON recruitment_posts;
DROP POLICY IF EXISTS recruitment_threads_access ON recruitment_threads;
DROP POLICY IF EXISTS recruitment_messages_select ON recruitment_messages;
DROP POLICY IF EXISTS recruitment_messages_insert ON recruitment_messages;

-- match_videos policies:
-- Read: Any member of the team can view. If team_id is null, only the uploader can view.
CREATE POLICY match_videos_select ON match_videos 
  FOR SELECT 
  USING (
    (team_id IS NULL AND uploaded_by = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = match_videos.team_id 
        AND team_members.user_id = auth.uid()
    )
  );

-- Insert: Only team coaches, analysts, IGLs, or solo players (team_id is null) can upload.
CREATE POLICY match_videos_insert ON match_videos 
  FOR INSERT 
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      team_id IS NULL OR EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = match_videos.team_id 
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('coach', 'analyst', 'IGL')
      )
    )
  );

-- video_annotations policies:
-- Read: Uploader or members of the video's team can view annotations.
CREATE POLICY video_annotations_select ON video_annotations 
  FOR SELECT 
  USING (
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

-- Insert/Modify: Only coaches, analysts, and IGLs (or solo uploaders) can write annotations.
CREATE POLICY video_annotations_modify ON video_annotations 
  FOR ALL 
  USING (
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

-- recruitment_posts policies:
-- Read: Open posts are publicly readable by any authenticated user.
CREATE POLICY recruitment_posts_select ON recruitment_posts 
  FOR SELECT 
  USING (
    status = 'open' OR posted_by = auth.uid()
  );

-- Write: Only the post creator can update/delete their own post.
CREATE POLICY recruitment_posts_modify ON recruitment_posts 
  FOR ALL 
  USING (
    posted_by = auth.uid()
  );

-- recruitment_threads policies:
-- Select/Write: Only the applicant or the post owner can access the thread.
CREATE POLICY recruitment_threads_access ON recruitment_threads 
  FOR ALL 
  USING (
    applicant_id = auth.uid() OR post_owner_id = auth.uid()
  );

-- recruitment_messages policies:
-- Select: User can only read messages belonging to their thread.
CREATE POLICY recruitment_messages_select ON recruitment_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_threads 
      WHERE recruitment_threads.id = recruitment_messages.thread_id
        AND (recruitment_threads.applicant_id = auth.uid() OR recruitment_threads.post_owner_id = auth.uid())
    )
  );

-- Insert: User can only insert into active threads they belong to.
CREATE POLICY recruitment_messages_insert ON recruitment_messages 
  FOR INSERT 
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM recruitment_threads 
      WHERE recruitment_threads.id = recruitment_messages.thread_id
        AND recruitment_threads.is_active = TRUE
        AND (recruitment_threads.applicant_id = auth.uid() OR recruitment_threads.post_owner_id = auth.uid())
    )
  );

-- ============================================================
-- Supabase Storage Buckets Configuration
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('match-videos', 'match-videos', TRUE, 2684354560, ARRAY['video/mp4', 'video/webm']),
  ('profile-photos', 'profile-photos', TRUE, 3145728, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for match-videos
DROP POLICY IF EXISTS "match-videos-read" ON storage.objects;
DROP POLICY IF EXISTS "match-videos-upload" ON storage.objects;
CREATE POLICY "match-videos-read" ON storage.objects FOR SELECT USING (bucket_id = 'match-videos');
CREATE POLICY "match-videos-upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'match-videos' AND auth.role() = 'authenticated'
);

-- Storage policies for profile-photos
DROP POLICY IF EXISTS "profile-photos-read" ON storage.objects;
DROP POLICY IF EXISTS "profile-photos-upload" ON storage.objects;
CREATE POLICY "profile-photos-read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
CREATE POLICY "profile-photos-upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos' AND auth.role() = 'authenticated'
);
