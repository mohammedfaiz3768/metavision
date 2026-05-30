// ============================================================
// FF Intel — Scrim Analytics (Pure Functions)
// No React dependencies. Testable. Cacheable. Cron-migratable.
// ============================================================

import type { ScrimRound, ScrimSession, MapId } from "@/lib/types/app.types";

// ---- Win/Loss Calculation ----

export interface RoundResult {
  isWin: boolean;
  isDraw: boolean;
  round: ScrimRound;
}

/**
 * Determine win/loss/draw for a single round.
 * Win = our placement < opponent placement.
 * If no opponent placement, win = placement <= 3.
 */
export function classifyRound(round: ScrimRound): RoundResult {
  if (round.opponent_placement && round.placement) {
    return {
      isWin: round.placement < round.opponent_placement,
      isDraw: round.placement === round.opponent_placement,
      round,
    };
  }
  // Fallback: top-3 considered a win
  return {
    isWin: round.placement != null && round.placement <= 3,
    isDraw: false,
    round,
  };
}

// ---- Session-Level Stats ----

export interface SessionRecord {
  wins: number;
  losses: number;
  draws: number;
  totalRounds: number;
  winRate: number; // 0-100
}

/**
 * Calculate W/L/D record for a set of rounds.
 */
export function calcScrimWinRate(rounds: ScrimRound[]): SessionRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const r of rounds) {
    const result = classifyRound(r);
    if (result.isDraw) draws++;
    else if (result.isWin) wins++;
    else losses++;
  }

  const total = rounds.length;
  return {
    wins,
    losses,
    draws,
    totalRounds: total,
    winRate: total > 0 ? (wins / total) * 100 : 0,
  };
}

// ---- Rival Aggregate Record ----

export interface RivalRecord extends SessionRecord {
  totalSessions: number;
  totalKills: number;
  totalOpponentKills: number;
  killDifferentialPerRound: number;
  avgPlacement: number;
}

/**
 * Calculate aggregate record across multiple sessions against a rival.
 */
export function calcRivalRecord(sessions: ScrimSession[]): RivalRecord {
  const allRounds: ScrimRound[] = [];
  for (const s of sessions) {
    if (s.scrim_rounds) {
      allRounds.push(...s.scrim_rounds);
    }
  }

  const record = calcScrimWinRate(allRounds);

  let totalKills = 0;
  let totalOppKills = 0;
  let totalPlacement = 0;
  let placementCount = 0;

  for (const r of allRounds) {
    totalKills += r.total_kills;
    totalOppKills += r.opponent_kills || 0;
    if (r.placement) {
      totalPlacement += r.placement;
      placementCount++;
    }
  }

  return {
    ...record,
    totalSessions: sessions.length,
    totalKills,
    totalOpponentKills: totalOppKills,
    killDifferentialPerRound: allRounds.length > 0
      ? (totalKills - totalOppKills) / allRounds.length
      : 0,
    avgPlacement: placementCount > 0 ? totalPlacement / placementCount : 0,
  };
}

// ---- Map Dominance ----

export interface MapDominance {
  map: MapId;
  rounds: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPlacement: number;
  avgKills: number;
}

/**
 * Calculate performance on a specific map across rounds.
 * If mapId is null, calculates for all maps grouped.
 */
export function calcMapDominance(rounds: ScrimRound[], mapId?: MapId): MapDominance[] {
  const grouped: Record<string, ScrimRound[]> = {};

  for (const r of rounds) {
    const map = r.map || "unknown";
    if (mapId && map !== mapId) continue;
    if (!grouped[map]) grouped[map] = [];
    grouped[map].push(r);
  }

  return Object.entries(grouped).map(([map, mapRounds]) => {
    let wins = 0;
    let losses = 0;
    let totalPlacement = 0;
    let totalKills = 0;
    let placementCount = 0;

    for (const r of mapRounds) {
      const result = classifyRound(r);
      if (result.isWin) wins++;
      else if (!result.isDraw) losses++;
      totalKills += r.total_kills;
      if (r.placement) {
        totalPlacement += r.placement;
        placementCount++;
      }
    }

    return {
      map: map as MapId,
      rounds: mapRounds.length,
      wins,
      losses,
      winRate: mapRounds.length > 0 ? (wins / mapRounds.length) * 100 : 0,
      avgPlacement: placementCount > 0 ? totalPlacement / placementCount : 0,
      avgKills: mapRounds.length > 0 ? totalKills / mapRounds.length : 0,
    };
  });
}

// ---- Kill Differential ----

export interface KillDifferential {
  totalOurs: number;
  totalTheirs: number;
  differential: number;
  perRound: number;
}

/**
 * Calculate kill differential across rounds.
 * Positive = we outfrag, negative = they outfrag.
 */
export function calcKillDifferential(rounds: ScrimRound[]): KillDifferential {
  let totalOurs = 0;
  let totalTheirs = 0;

  for (const r of rounds) {
    totalOurs += r.total_kills;
    totalTheirs += r.opponent_kills || 0;
  }

  return {
    totalOurs,
    totalTheirs,
    differential: totalOurs - totalTheirs,
    perRound: rounds.length > 0 ? (totalOurs - totalTheirs) / rounds.length : 0,
  };
}

// ---- Player Scrim Performance ----

export interface PlayerScrimPerformance {
  playerName: string;
  rounds: number;
  totalKills: number;
  totalDamage: number;
  survivalRate: number; // 0-100
  avgKills: number;
  avgDamage: number;
}

/**
 * Calculate per-player aggregates across scrim rounds.
 */
export function calcPlayerScrimPerformance(rounds: ScrimRound[]): PlayerScrimPerformance[] {
  const playerMap: Record<string, { kills: number; damage: number; survived: number; rounds: number }> = {};

  for (const r of rounds) {
    for (const p of r.scrim_round_players || []) {
      if (!playerMap[p.player_name]) {
        playerMap[p.player_name] = { kills: 0, damage: 0, survived: 0, rounds: 0 };
      }
      playerMap[p.player_name].kills += p.kills;
      playerMap[p.player_name].damage += p.damage;
      playerMap[p.player_name].survived += p.survived ? 1 : 0;
      playerMap[p.player_name].rounds++;
    }
  }

  return Object.entries(playerMap)
    .map(([name, stats]) => ({
      playerName: name,
      rounds: stats.rounds,
      totalKills: stats.kills,
      totalDamage: stats.damage,
      survivalRate: stats.rounds > 0 ? (stats.survived / stats.rounds) * 100 : 0,
      avgKills: stats.rounds > 0 ? stats.kills / stats.rounds : 0,
      avgDamage: stats.rounds > 0 ? stats.damage / stats.rounds : 0,
    }))
    .sort((a, b) => b.avgKills - a.avgKills);
}
