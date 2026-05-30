"use client";

import { useTeam } from "@/hooks/useTeam";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, AlertTriangle, Landmark, TrendingUp, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ScrimSession {
  id: string;
  session_date: string;
  time_slot: string;
  total_rounds: number;
  entry_fee: number;
  prize_pool_received: number | null;
  overall_standing: number | null;
  total_scrim_points: number;
}

export default function ScrimsListPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();

  // Fetch scrim sessions from route
  const { data: sessions, isLoading: scrimsLoading, error } = useQuery<ScrimSession[]>({
    queryKey: ["team-scrims", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const response = await fetch(`/api/scrims?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to fetch scrim sessions");
      return response.json();
    },
    enabled: !!currentTeam?.id,
  });

  const loading = teamLoading || scrimsLoading;

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-500 animate-pulse font-medium">Retrieving scrim sessions...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-[#111827]">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
          <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
        </div>
        <p className="text-[15px] font-semibold text-[#111827] mb-1">No Active Team</p>
        <p className="text-[13px] text-[#6B7280] mb-4">Please join or create a team to access scrim session logs.</p>
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
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Scrim Sessions</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Log and analyze your lobby scrims points, standings placements, and net profit yields.
          </p>
        </div>

        <Link href="/scrims/new">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Swords className="h-4 w-4" />
            Create Scrim Session
          </Button>
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const prize = session.prize_pool_received || 0;
            const net = prize - session.entry_fee;
            const isLoss = net < 0;

            const formattedTimeSlot = (() => {
               switch (session.time_slot?.toLowerCase()) {
                 case "12pm": return "12:00 PM";
                 case "3pm": return "03:00 PM";
                 case "6pm": return "06:00 PM";
                 case "9pm": return "09:00 PM";
                 case "12am": return "12:00 AM";
                 default: return session.time_slot?.toUpperCase() || "N/A";
               }
            })();

            return (
              <Card key={session.id} className="border border-[#E5E7EB] bg-white transition-all hover:border-[#6366F1]/50 hover:shadow-md rounded-[12px] overflow-hidden flex flex-col justify-between shadow-sm">
                <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#6366F1]" />
                    <span className="text-xs font-bold font-mono text-[#374151]">{session.session_date}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1] font-bold uppercase tracking-wider font-mono">
                    {session.total_rounds} Matches
                  </span>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Time slot and overall standings */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-slate-50 border border-[#E5E7EB] rounded-[8px] p-2.5">
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-[#6B7280] uppercase tracking-wider mb-0.5 font-mono">
                          <Clock className="h-3 w-3" />
                          Time Slot
                        </div>
                        <span className="text-xs font-bold text-[#111827] font-mono">{formattedTimeSlot}</span>
                      </div>
                      <div className="bg-slate-50 border border-[#E5E7EB] rounded-[8px] p-2.5">
                        <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block mb-0.5 font-mono">
                          Standing
                        </span>
                        <span className="text-xs font-bold text-[#111827]">
                          {session.overall_standing
                            ? `${session.overall_standing}${
                                session.overall_standing === 1 ? "st" : session.overall_standing === 2 ? "nd" : session.overall_standing === 3 ? "rd" : "th"
                              } Place`
                            : "Not Recorded"}
                        </span>
                      </div>
                    </div>

                    {/* Points and Net Profit */}
                    <div className="flex items-center justify-between pt-4 pb-2 border-t border-[#E5E7EB] mt-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold text-[#6B7280] font-mono">Total Points</span>
                        <span className="text-sm font-mono font-extrabold text-[#111827]">{session.total_scrim_points} pts</span>
                      </div>

                      {/* Profit/loss Badge */}
                      <div className={cn(
                        "px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1 border",
                        isLoss
                          ? "bg-rose-50 border-rose-100 text-rose-700"
                          : "bg-emerald-50 border-emerald-100 text-emerald-700"
                      )}>
                        {isLoss ? `Loss -$${Math.abs(net)}` : `Profit +$${net}`}
                      </div>
                    </div>
                  </div>

                  {/* Enter Detail Button */}
                  <Link href={`/scrims/${session.id}`} className="block w-full pt-2">
                    <Button variant="secondary" className="w-full text-xs font-bold uppercase tracking-wider font-mono bg-slate-50 hover:bg-[#6366F1] hover:text-white border border-[#E5E7EB] text-[#374151] rounded-[8px] transition-colors cursor-pointer">
                      View Session Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#D1D5DB] rounded-[12px] bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
            <Swords className="w-5 h-5 text-[#6B7280]" />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">No Scrim Sessions Recorded</p>
          <p className="text-[13px] text-[#6B7280] mb-4 max-w-sm">
            Log your lobby performance across 3 or 6 rounds to compile placement points trends and team financial ROIs.
          </p>
          <Link href="/scrims/new">
            <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
              <Swords className="h-4 w-4" />
              Record First Scrim Session
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
