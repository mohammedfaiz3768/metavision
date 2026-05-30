"use client";

import { useTeam } from "@/hooks/useTeam";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trophy, DollarSign, Calendar, AlertTriangle, Activity } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TournamentsPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();
  const supabase = createClient();

  const { data: tournaments, isLoading: tourLoading } = useQuery<any[]>({
    queryKey: ["tournaments", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const response = await fetch(`/api/tournaments?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      return response.json();
    },
    enabled: !!currentTeam?.id,
  });

  const loading = teamLoading || tourLoading;

  // Compute tournament analytics aggregates
  const stats = (() => {
    if (!tournaments || tournaments.length === 0) {
      return { total: 0, official: 0, unofficial: 0, totalPrize: 0, averagePosition: 0 };
    }
    let official = 0;
    let unofficial = 0;
    let totalPrize = 0;
    let positionSum = 0;
    let concludedCount = 0;

    for (const t of tournaments) {
      if (t.type === "official") official++;
      else unofficial++;

      if (t.prize_received !== null) {
        totalPrize += Number(t.prize_received);
      }

      if (t.final_position !== null) {
        positionSum += t.final_position;
        concludedCount++;
      }
    }

    return {
      total: tournaments.length,
      official,
      unofficial,
      totalPrize,
      averagePosition: concludedCount > 0 ? (positionSum / concludedCount).toFixed(1) : 0,
    };
  })();

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-500 animate-pulse font-medium">Compiling tournament registries...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-[#111827] bg-[#F8F9FA]">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
          <Trophy className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-[15px] font-semibold text-[#111827] mb-1">No active roster</p>
        <p className="text-[13px] text-slate-500 mb-4">Please join or create a team to access competitive tournaments registries.</p>
        <Link href="/dashboard">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors shadow-sm cursor-pointer">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-[#374151]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Tournaments Hub</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Log and analyze multi-stage official championship routes, placement standings, and earnings.
          </p>
        </div>

        <Link href="/tournaments/new">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Plus className="h-4 w-4" />
            Register Tournament
          </Button>
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Activity className="h-3 w-3 text-[#6366F1]" /> Total Tournaments
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-[#111827]">{stats.total}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Registered in current team roster</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Official / Unofficial
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono tracking-tight text-[#111827]">{stats.official}</p>
              <span className="text-xs text-slate-500 font-medium">official</span>
              <span className="text-slate-300">/</span>
              <p className="text-xl font-semibold font-mono text-slate-600">{stats.unofficial}</p>
              <span className="text-[10px] text-slate-400">unofficial</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Trophy className="h-3 w-3 text-sky-500" /> Avg Placement Finish
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-sky-600">
              {stats.averagePosition ? `#${stats.averagePosition}` : "N/A"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Across completed tournament stages</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-500" /> Total Earnings
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
              ${stats.totalPrize.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Withdrawn cumulative cash prizes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tournaments Grid */}
      {!tournaments || tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#D1D5DB] rounded-[12px] bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
            <Trophy className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">No Tournaments Tracked</p>
          <p className="text-[13px] text-slate-500 mb-4 max-w-sm">
            Your squad has not registered any official or unofficial tournament campaigns yet. Click the button above to begin tracking.
          </p>
          <Link href="/tournaments/new">
            <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="h-4 w-4" />
              Register first tournament
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
