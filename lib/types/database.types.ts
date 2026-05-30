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
          role: 'player' | 'coach' | 'analyst' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          role?: 'player' | 'coach' | 'analyst' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          role?: 'player' | 'coach' | 'analyst' | 'admin';
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
    };
  };
}
