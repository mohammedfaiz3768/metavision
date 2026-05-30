import type { Match, MatchPlayer } from "@/lib/types/app.types";

export interface PlacementTrendData {
  name: string; // Match index or label (e.g. "Match 1", "Match 2")
  placement: number;
  kills: number;
}

export interface MapPerformanceData {
  mapName: string;
  avgPlacement: number;
  totalKills: number;
  matchesPlayed: number;
}

export interface SurvivalDistributionData {
  name: string;
  value: number;
}

export interface PlayerAverageData {
  playerName: string;
  avgKills: number;
  avgDamage: number;
  survivalRate: number;
  totalMatches: number;
}

/**
 * Pure functions to aggregate tactical performance trends from raw telemetry rows.
 * Isolated from React cycles, allowing execution in backend jobs, edge workers, or client-side memoized boundaries.
 */

export function calculatePlacementTrend(matches: Match[]): PlacementTrendData[] {
  // Sort matches chronologically
  const activeMatches = [...matches]
    .filter((m) => !m.deleted_at)
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

  return activeMatches.map((m, idx) => ({
    name: `Match ${idx + 1}`,
    placement: m.placement || 0,
    kills: m.total_kills || 0,
  }));
}

export function calculateMapPerformance(matches: Match[]): MapPerformanceData[] {
  const activeMatches = matches.filter((m) => !m.deleted_at);
  const mapGroups: Record<string, { totalPlacement: number; totalKills: number; count: number }> = {};

  activeMatches.forEach((m) => {
    if (!m.map) return;
    const mapKey = m.map;
    if (!mapGroups[mapKey]) {
      mapGroups[mapKey] = { totalPlacement: 0, totalKills: 0, count: 0 };
    }
    mapGroups[mapKey].totalPlacement += m.placement || 12;
    mapGroups[mapKey].totalKills += m.total_kills || 0;
    mapGroups[mapKey].count += 1;
  });

  return Object.entries(mapGroups).map(([mapName, data]) => ({
    mapName: mapName.charAt(0).toUpperCase() + mapName.slice(1), // Capitalize Bermuda, Nexterra...
    avgPlacement: Number((data.totalPlacement / data.count).toFixed(1)),
    totalKills: data.totalKills,
    matchesPlayed: data.count,
  }));
}

export function calculateSurvivalDistribution(matches: Match[]): SurvivalDistributionData[] {
  const activeMatches = matches.filter((m) => !m.deleted_at);
  if (activeMatches.length === 0) return [];

  let earlyCount = 0; // 9th to 12th placement
  let midCount = 0;   // 5th to 8th placement
  let lateCount = 0;  // 1st to 4th placement

  activeMatches.forEach((m) => {
    const p = m.placement || 12;
    if (p <= 4) lateCount++;
    else if (p <= 8) midCount++;
    else earlyCount++;
  });

  return [
    { name: "Early Game Exit (Rank 9-12)", value: earlyCount },
    { name: "Mid Game Exit (Rank 5-8)", value: midCount },
    { name: "Late Game Climax (Rank 1-4)", value: lateCount },
  ].filter((d) => d.value > 0);
}

export function calculatePlayerAverages(
  players: MatchPlayer[],
  matchesCount: number
): PlayerAverageData[] {
  if (players.length === 0 || matchesCount === 0) return [];

  const playerStats: Record<
    string,
    { totalKills: number; totalDamage: number; survivalCount: number; count: number }
  > = {};

  players.forEach((p) => {
    const name = p.player_name;
    if (!playerStats[name]) {
      playerStats[name] = { totalKills: 0, totalDamage: 0, survivalCount: 0, count: 0 };
    }
    playerStats[name].totalKills += p.kills || 0;
    playerStats[name].totalDamage += p.damage || 0;
    playerStats[name].survivalCount += p.survived ? 1 : 0;
    playerStats[name].count += 1;
  });

  return Object.entries(playerStats).map(([playerName, data]) => ({
    playerName,
    avgKills: Number((data.totalKills / data.count).toFixed(1)),
    avgDamage: Number((data.totalDamage / data.count).toFixed(0)),
    survivalRate: Number(((data.survivalCount / data.count) * 100).toFixed(0)),
    totalMatches: data.count,
  }));
}
