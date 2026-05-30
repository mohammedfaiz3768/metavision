"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Map } from "lucide-react";

interface RoundCardProps {
  round: {
    round_number: number;
    placement: number;
    kills: number;
    map: string;
    placement_points: number;
    kill_points: number;
    total_round_points: number;
  };
}

export function RoundCard({ round }: RoundCardProps) {
  const isTop3 = round.placement <= 3;
  const isWin = round.placement === 1;

  return (
    <Card className={cn(
      "border-[#E5E7EB] bg-white transition-all hover:shadow-sm select-none rounded-[12px] overflow-hidden shadow-sm",
      isWin ? "border-amber-400 bg-amber-50/50" : isTop3 ? "border-[#6366F1]/40 bg-indigo-50/30" : ""
    )}>
      <CardContent className="p-4 flex items-center justify-between">
        {/* Left: Round Name */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">
            Match {round.round_number}
          </span>
          <span className={cn(
            "text-xs font-bold font-mono",
            isWin ? "text-amber-600 font-extrabold" : isTop3 ? "text-[#6366F1]" : "text-[#111827]"
          )}>
            {round.placement}
            {round.placement === 1 ? "st" : round.placement === 2 ? "nd" : round.placement === 3 ? "rd" : "th"} Place
          </span>
        </div>

        {/* Center: Stat detail */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Map</span>
            <span className="text-xs font-bold text-slate-700 capitalize">{round.map || "N/A"}</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Kills</span>
            <span className="text-xs font-mono font-bold text-[#111827]">{round.kills}</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Placement Pts</span>
            <span className="text-xs font-mono font-bold text-[#111827]">{round.placement_points}</span>
          </div>
        </div>

        {/* Right: Total points circle */}
        <div className="border-l border-[#E5E7EB] pl-4 text-right">
          <span className="text-[9px] uppercase font-bold text-[#6366F1] block font-mono">Points</span>
          <span className="text-sm font-mono font-extrabold text-[#6366F1]">{round.total_round_points}</span>
        </div>
      </CardContent>
    </Card>
  );
}
