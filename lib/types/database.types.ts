// ============================================================
// FF Intel — Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          role: 'player' | 'coach' | 'analyst' | 'admin' | string;
          full_name: string | null;
          age: number | null;
          in_game_name: string | null;
          bio: string | null;
          social_links: Json | null;
          show_team_on_profile: boolean;
          profile_complete: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          role?: 'player' | 'coach' | 'analyst' | 'admin' | string;
          full_name?: string | null;
          age?: number | null;
          in_game_name?: string | null;
          bio?: string | null;
          social_links?: Json | null;
          show_team_on_profile?: boolean;
          profile_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          role?: 'player' | 'coach' | 'analyst' | 'admin' | string;
          full_name?: string | null;
          age?: number | null;
          in_game_name?: string | null;
          bio?: string | null;
          social_links?: Json | null;
          show_team_on_profile?: boolean;
          profile_complete?: boolean;
          created_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          owner_id: string | null;
          region: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          owner_id?: string | null;
          region?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          owner_id?: string | null;
          region?: string | null;
          created_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: 'IGL' | 'entry' | 'support' | 'sniper' | 'coach' | 'analyst' | 'player';
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: 'IGL' | 'entry' | 'support' | 'sniper' | 'coach' | 'analyst' | 'player';
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: 'IGL' | 'entry' | 'support' | 'sniper' | 'coach' | 'analyst' | 'player';
          joined_at?: string;
        };
      };
      strategy_boards: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          map: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara';
          canvas_data: Json;
          is_public: boolean;
          public_token: string | null;
          thumbnail_url: string | null;
          deleted_at: string | null;
          created_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          title: string;
          map: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara';
          canvas_data?: Json;
          is_public?: boolean;
          public_token?: string | null;
          thumbnail_url?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          title?: string;
          map?: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara';
          canvas_data?: Json;
          is_public?: boolean;
          public_token?: string | null;
          thumbnail_url?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          team_id: string;
          map: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          placement: number | null;
          total_kills: number;
          screenshot_url: string | null;
          ocr_data: Json;
          ai_summary: string | null;
          played_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          map?: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          placement?: number | null;
          total_kills?: number;
          screenshot_url?: string | null;
          ocr_data?: Json;
          ai_summary?: string | null;
          played_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          map?: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          placement?: number | null;
          total_kills?: number;
          screenshot_url?: string | null;
          ocr_data?: Json;
          ai_summary?: string | null;
          played_at?: string;
          created_at?: string;
        };
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          kills: number;
          damage: number;
          survived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          kills?: number;
          damage?: number;
          survived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          kills?: number;
          damage?: number;
          survived?: boolean;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          match_id: string;
          type: 'knock' | 'death' | 'rotation' | 'fight' | 'revive' | 'utility' | 'vehicle';
          x: number;
          y: number;
          player_name: string | null;
          timestamp_ms: number | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          match_id: string;
          type: 'knock' | 'death' | 'rotation' | 'fight' | 'revive' | 'utility' | 'vehicle';
          x: number;
          y: number;
          player_name?: string | null;
          timestamp_ms?: number | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          match_id?: string;
          type?: 'knock' | 'death' | 'rotation' | 'fight' | 'revive' | 'utility' | 'vehicle';
          x?: number;
          y?: number;
          player_name?: string | null;
          timestamp_ms?: number | null;
          metadata?: Json;
        };
      };
      scrim_sessions: {
        Row: {
          id: string;
          team_id: string;
          opponent_name: string | null;
          map: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          notes: string | null;
          results: Json;
          session_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          opponent_name?: string | null;
          map?: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          notes?: string | null;
          results?: Json;
          session_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          opponent_name?: string | null;
          map?: 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara' | null;
          notes?: string | null;
          results?: Json;
          session_date?: string;
          created_at?: string;
        };
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          token: string;
          created_by: string | null;
          max_uses: number;
          uses: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          token: string;
          created_by?: string | null;
          max_uses?: number;
          uses?: number;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          token?: string;
          created_by?: string | null;
          max_uses?: number;
          uses?: number;
          expires_at?: string;
          created_at?: string;
        };
      };
      match_videos: {
        Row: {
          id: string;
          team_id: string | null;
          uploaded_by: string;
          title: string;
          video_url: string;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          uploaded_by: string;
          title: string;
          video_url: string;
          duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string | null;
          uploaded_by?: string;
          title?: string;
          video_url?: string;
          duration_seconds?: number;
          created_at?: string;
        };
      };
      video_annotations: {
        Row: {
          id: string;
          video_id: string;
          created_by: string;
          timestamp_seconds: number;
          canvas_data: Json;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          created_by: string;
          timestamp_seconds: number;
          canvas_data?: Json;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          created_by?: string;
          timestamp_seconds?: number;
          canvas_data?: Json;
          note?: string | null;
          created_at?: string;
        };
      };
      recruitment_posts: {
        Row: {
          id: string;
          posted_by: string;
          team_id: string | null;
          post_type: 'player_seeking_team' | 'team_seeking_player';
          title: string;
          description: string;
          roles: Json;
          status: 'open' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          posted_by: string;
          team_id?: string | null;
          post_type: 'player_seeking_team' | 'team_seeking_player';
          title: string;
          description: string;
          roles?: Json;
          status?: 'open' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          posted_by?: string;
          team_id?: string | null;
          post_type?: 'player_seeking_team' | 'team_seeking_player';
          title?: string;
          description?: string;
          roles?: Json;
          status?: 'open' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
      };
      recruitment_threads: {
        Row: {
          id: string;
          post_id: string;
          applicant_id: string;
          post_owner_id: string;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          post_id: string;
          applicant_id: string;
          post_owner_id: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          post_id?: string;
          applicant_id?: string;
          post_owner_id?: string;
          created_at?: string;
          is_active?: boolean;
        };
      };
      recruitment_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          sent_at: string;
          is_read: boolean;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          content: string;
          sent_at?: string;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          content?: string;
          sent_at?: string;
          is_read?: boolean;
        };
      };
      scrim_round_players: {
        Row: {
          id: string;
          round_id: string;
          player_id: string | null;
          player_name: string;
          kills: number;
          damage: number;
          survived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          player_id?: string | null;
          player_name: string;
          kills?: number;
          damage?: number;
          survived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          player_id?: string | null;
          player_name?: string;
          kills?: number;
          damage?: number;
          survived?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
