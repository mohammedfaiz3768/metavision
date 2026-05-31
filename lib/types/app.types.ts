// ============================================================
// FF Intel — Application-Level TypeScript Types
// ============================================================

// ---- Maps ----

export type MapId = 'bermuda' | 'purgatory' | 'kalahari' | 'nexterra' | 'solara';

export interface MapConfig {
  id: MapId;
  displayName: string;
  publicPath: string;
  canonicalSize: { width: number; height: number };
}

// ---- Roles ----

/** DB role stored in team_members.role */
export type TeamMemberDbRole = 'IGL' | 'entry' | 'support' | 'sniper' | 'coach' | 'analyst' | 'player';

/** Permission-level role derived from DB role */
export type TeamPermissionRole = 'owner' | 'coach' | 'analyst' | 'player';

/** In-game tactical role (display only) */
export type IngameRole = 'IGL' | 'entry' | 'support' | 'sniper';

/** Profile-level role */
export type ProfileRole = 'player' | 'coach' | 'analyst' | 'admin';

export function getPermissionRole(dbRole: TeamMemberDbRole): TeamPermissionRole {
  switch (dbRole) {
    case 'coach':
      return 'coach';
    case 'analyst':
      return 'analyst';
    case 'IGL':
    case 'entry':
    case 'support':
    case 'sniper':
    case 'player':
      return 'player';
  }
}

export function canCreateBoard(role: TeamMemberDbRole): boolean {
  return ['coach', 'IGL', 'analyst'].includes(role);
}

export function canDeleteBoard(role: TeamMemberDbRole): boolean {
  return ['coach', 'IGL', 'analyst'].includes(role);
}

export function canEditCanvas(_role: TeamMemberDbRole): boolean {
  return true; // all team members can draw
}

// ---- Database Models ----

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string | null;
  region: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberDbRole;
  joined_at: string;
  // Joined fields
  profiles?: Profile;
}

export interface StrategyBoard {
  id: string;
  team_id: string;
  title: string;
  map: MapId;
  canvas_data: CanvasDocument | null;
  is_public: boolean;
  public_token: string | null;
  thumbnail_url: string | null;
  deleted_at: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
  // Joined fields
  profiles?: Profile;
}

export enum TelemetryEventType {
  Knock = 'knock',
  Death = 'death',
  Fight = 'fight',
  Rotation = 'rotation',
  Revive = 'revive',
  Utility = 'utility',
  Vehicle = 'vehicle',
}

export interface Match {
  id: string;
  team_id: string;
  map: MapId | null;
  placement: number | null;
  total_kills: number;
  screenshot_url: string | null;
  ocr_data: Record<string, unknown>;
  ai_summary: string | null;
  played_at: string;
  deleted_at: string | null;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_name: string;
  kills: number;
  damage: number;
  survived: boolean;
  created_at: string;
}

export interface MapEvent {
  id: string;
  client_event_id: string | null; // Client-side generated UUID for robust idempotency
  match_id: string;
  type: TelemetryEventType;
  x: number;
  y: number;
  player_name: string | null;
  timestamp_ms: number | null;
  metadata: Record<string, unknown>;
  schema_version: number;
  deleted_at: string | null;
  created_at: string;
}

export type ScrimSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'elite';

export interface ScrimSession {
  id: string;
  team_id: string;
  rival_id: string | null;
  opponent_name: string;
  status: ScrimSessionStatus;
  notes: string | null;
  session_date: string;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  rival_profiles?: RivalProfile;
  scrim_rounds?: ScrimRound[];
}

export interface ScrimRound {
  id: string;
  session_id: string;
  round_number: number;
  map: MapId | null;
  placement: number | null;
  total_kills: number;
  opponent_kills: number;
  opponent_placement: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  scrim_round_players?: ScrimRoundPlayer[];
}

export interface ScrimRoundPlayer {
  id: string;
  round_id: string;
  player_id: string | null;  // nullable — roster members can leave
  player_name: string;       // snapshot fallback for historical integrity
  kills: number;
  damage: number;
  survived: boolean;
  created_at: string;
}

export interface RivalLandingSpot {
  map: MapId;
  poi: string;
  confidence: number; // 0-1
}

export interface RivalProfile {
  id: string;
  team_id: string;
  name: string;
  tag: string | null;
  region: string | null;
  preferred_maps: MapId[];
  landing_spots: RivalLandingSpot[];
  playstyle_notes: string | null;
  threat_level: ThreatLevel;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  token: string;
  created_by: string | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  created_at: string;
}

// ---- Whiteboard ----

export type LayerType = 'rotations' | 'enemy_routes' | 'zones' | 'utility' | 'notes' | 'custom';

export type ToolType = 'select' | 'freedraw' | 'rotation' | 'arrow' | 'circle' | 'rect' | 'text' | 'marker' | 'pan';

export type CanvasNodeType = 'freedraw' | 'rotation' | 'arrow' | 'circle' | 'rect' | 'text' | 'marker';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  layer: LayerType;

  // Position — ALL normalized 0-1 relative to canvas
  x: number;
  y: number;

  // Spatial Bounding Box — normalized 0-1
  min_x?: number;
  min_y?: number;
  max_x?: number;
  max_y?: number;

  // Transient drag locking
  lockedBy?: string | null;
  lockExpiresAt?: string | null;

  // Freedraw points — flat array [x1, y1, x2, y2, ...]
  // EVERY value is independently normalized 0-1
  points?: number[];

  // Dimensions — normalized 0-1
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number; // degrees, NOT normalized

  // Style — raw values
  color: string;
  strokeWidth: number; // px 1-8
  opacity?: number; // 0-1
  fontSize?: number; // px

  // Type-specific
  text?: string;
  markerType?: string;
  pointerLength?: number; // px
  pointerWidth?: number; // px

  // Metadata
  createdBy: string;
  updatedBy: string;
  updatedAt: number; // Date.now() — for UI/debug only, NOT conflict resolution
  version: number; // conflict resolution — authoritative
}

export interface CanvasDocument {
  schemaVersion: 1;
  nodes: CanvasNode[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface Viewport {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

// ---- Tactical Markers ----

export interface TacticalMarkerDef {
  id: string;
  label: string;
  icon: string;
}

// ---- Realtime ----

export interface CursorPosition {
  user_id: string;
  username: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  color: string;
}

export interface CanvasDiff {
  op: 'add' | 'update' | 'delete';
  layer: LayerType;
  nodeId: string;
  nodeData?: CanvasNode;
  version: number;
  authoritative?: boolean;
}

// ---- OCR ----

export interface OcrPlayerResult {
  name: string;
  kills: number | null;
  damage: number | null;
  survived: boolean | null;
}

export interface OcrResult {
  placement: number | null;
  total_kills: number | null;
  players: OcrPlayerResult[];
  requires_manual_input: boolean;
  raw_text: string;
}

// ---- AI Coaching ----

export interface CoachingInput {
  current_match: {
    map: string;
    placement: number;
    total_kills: number;
    players: Array<{
      name: string;
      kills: number;
      damage: number;
      survived: boolean;
    }>;
  };
  recent_performance: Array<{
    map: string;
    placement: number;
    total_kills: number;
  }>;
  avg_placement: number;
  avg_kills: number;
}
