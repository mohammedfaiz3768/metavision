-- ============================================================
-- SQL Migration: 02_revisions_and_snapshots.sql
-- Creates periodic snapshots and linear revisions tracking.
-- ============================================================

-- 1. Create board_snapshots table (Periodic Full Snapshots every 50 commits)
CREATE TABLE IF NOT EXISTS board_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES strategy_boards(id) ON DELETE CASCADE NOT NULL,
  snapshot_number INT NOT NULL,
  nodes_json JSONB NOT NULL, -- Full array of CanvasNode shapes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, snapshot_number)
);

-- Index for snapshot speed fetches
CREATE INDEX IF NOT EXISTS idx_board_snapshots_board 
ON board_snapshots(board_id, snapshot_number);

-- 2. Create board_revisions table (Linear Delta Revisions)
CREATE TABLE IF NOT EXISTS board_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES strategy_boards(id) ON DELETE CASCADE NOT NULL,
  revision_number INT NOT NULL,
  mutation_json JSONB NOT NULL, -- Action representation: { type: 'ADD_NODE' | 'UPDATE_NODE_STYLE' | 'UPDATE_NODE_POSITION' | 'DELETE_NODE', nodeId: UUID, changes: JSON }
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, revision_number)
);

-- Index for linear delta replay fetches
CREATE INDEX IF NOT EXISTS idx_board_revisions_board_num 
ON board_revisions(board_id, revision_number);
