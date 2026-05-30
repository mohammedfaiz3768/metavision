-- ============================================================
-- SQL Migration: 06_scrim_and_tournament_adjustments.sql
-- Adjusts Scrims for Time Slots & Round-level Maps.
-- Implements progressive Tournament Stage qualification & elimination logic.
-- ============================================================

-- 1. Overhaul Scrim Sessions to support Time Slots instead of Map
ALTER TABLE scrim_sessions DROP CONSTRAINT IF EXISTS scrim_sessions_map_check;
ALTER TABLE scrim_sessions RENAME COLUMN map TO time_slot;

-- Update existing rows to a default valid time slot to avoid constraint violations
UPDATE scrim_sessions SET time_slot = '12pm' WHERE time_slot NOT IN ('12pm','3pm','6pm','9pm','12am') OR time_slot IS NULL;

ALTER TABLE scrim_sessions ADD CONSTRAINT scrim_sessions_time_slot_check CHECK (time_slot IN ('12pm','3pm','6pm','9pm','12am'));

-- 2. Add Map column to Scrim Rounds (since maps are logged per match/round)
ALTER TABLE scrim_rounds ADD COLUMN map TEXT CHECK (map IN ('bermuda','purgatory','kalahari','nexterra','solara')) NOT NULL DEFAULT 'bermuda';

-- 3. Adjust Tournament Stages to track match counts and qualification status
ALTER TABLE tournament_stages ADD COLUMN total_matches INT NOT NULL DEFAULT 6 CHECK (total_matches > 0);
ALTER TABLE tournament_stages ADD COLUMN status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'qualified', 'eliminated'));

-- 4. Adjust Tournaments to track elimination stage and ongoing status
ALTER TABLE tournaments ADD COLUMN eliminated_stage TEXT DEFAULT NULL;
ALTER TABLE tournaments ADD COLUMN status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'concluded', 'eliminated'));
