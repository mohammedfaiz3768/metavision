-- ============================================================
-- SQL Migration: 01_board_nodes_and_permissions.sql
-- Creates row-based canvas nodes persistence, transient drag locks, 
-- and granular access permissions control.
-- ============================================================

-- 1. Create board_nodes table (Individual Row Persistence)
CREATE TABLE IF NOT EXISTS board_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES strategy_boards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('freedraw', 'rotation', 'arrow', 'circle', 'rect', 'text', 'marker')),
  layer TEXT NOT NULL CHECK (layer IN ('rotations', 'enemy_routes', 'zones', 'utility', 'notes', 'custom')),
  
  -- Core coordinate position (normalized 0-1)
  x DOUBLE PRECISION NOT NULL CHECK (x BETWEEN 0 AND 1),
  y DOUBLE PRECISION NOT NULL CHECK (y BETWEEN 0 AND 1),
  
  -- Shape parameters (points arrays, colors, dimensions, etc.)
  node_json JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  
  -- Bounding Box limits (authoritatively verified on server)
  min_x DOUBLE PRECISION NOT NULL CHECK (min_x BETWEEN 0 AND 1),
  min_y DOUBLE PRECISION NOT NULL CHECK (min_y BETWEEN 0 AND 1),
  max_x DOUBLE PRECISION NOT NULL CHECK (max_x BETWEEN 0 AND 1),
  max_y DOUBLE PRECISION NOT NULL CHECK (max_y BETWEEN 0 AND 1),
  
  -- Transient Drag Locking Columns
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lock_expires_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Audits & Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Create board_permissions table (Granular Sharing Hierarchy)
CREATE TABLE IF NOT EXISTS board_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES strategy_boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- ============================================================
-- INDEXES FOR SCALE & SPEED
-- ============================================================

-- Fast lookup for loading board layers
CREATE INDEX IF NOT EXISTS idx_board_nodes_board_active 
ON board_nodes(board_id) 
WHERE deleted_at IS NULL;

-- Index bounding box ranges for viewport spatial queries
CREATE INDEX IF NOT EXISTS idx_board_nodes_spatial 
ON board_nodes(board_id, min_x, min_y, max_x, max_y) 
WHERE deleted_at IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE board_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_permissions ENABLE ROW LEVEL SECURITY;

-- Board Permissions: user can see their own permissions or if they belong to the team
CREATE POLICY permissions_select ON board_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR board_id IN (
      SELECT id FROM strategy_boards 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Board Nodes: read permissions (anyone who can read the parent board)
CREATE POLICY nodes_select ON board_nodes FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM strategy_boards 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR is_public = TRUE
    )
  );

-- Board Nodes: write permissions (handled securely inside API route middleware, 
-- but RLS serves as secondary safety guard for authentic users)
CREATE POLICY nodes_write ON board_nodes FOR ALL
  USING (
    board_id IN (
      SELECT id FROM strategy_boards 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );
