/**
 * Esports placement points lookup table.
 * 1st: 12, 2nd: 9, 3rd: 8, 4th: 7, 5th: 6, 6th: 5, 
 * 7th: 4, 8th: 3, 9th: 2, 10th: 1, 11th: 1, 12th: 0.
 */
export const PLACEMENT_POINTS: Record<number, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 1,
  12: 0,
};

/**
 * Calculates placement points based on raw placement finish.
 */
export function getPlacementPoints(placement: number): number {
  return PLACEMENT_POINTS[placement] ?? 0;
}

/**
 * Calculates total round/match points based on placement and kills.
 * Each kill equals exactly 1 point.
 */
export function calculateTotalPoints(placement: number, kills: number): {
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
} {
  const placementPoints = getPlacementPoints(placement);
  const killPoints = kills;
  return {
    placementPoints,
    killPoints,
    totalPoints: placementPoints + killPoints,
  };
}
