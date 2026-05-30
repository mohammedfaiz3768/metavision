import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, DollarSign, ArrowRight, Zap, Target } from "lucide-react";
import { format } from "date-fns";

interface Tournament {
  id: string;
  name: string;
  type: "official" | "unofficial";
  prize_pool_type: "top3" | "top5" | "top12";
  start_date: string | null;
  final_position: number | null;
  prize_received: number | null;
  status?: "ongoing" | "concluded" | "eliminated";
  eliminated_stage?: string | null;
}

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const isConcluded = tournament.final_position !== null;

  return (
    <Card className="relative overflow-hidden border border-[#E5E7EB] bg-white hover:border-[#6366F1]/50 transition-all group duration-300 rounded-[12px] shadow-sm hover:shadow-md select-none">
      {/* Decorative gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#10B981]" />
      
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <Badge 
            variant="outline"
            className={
              tournament.type === "official"
                ? "border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-mono tracking-wider font-extrabold uppercase px-2 rounded-[4px]"
                : "border-sky-200 bg-sky-50 text-sky-850 text-[10px] font-mono tracking-wider font-extrabold uppercase px-2 rounded-[4px]"
            }
          >
            {tournament.type}
          </Badge>
          
          {tournament.status === "concluded" || (tournament.status === undefined && isConcluded) ? (
            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono tracking-wider uppercase px-2 font-bold rounded-[4px]">
              Concluded
            </Badge>
          ) : tournament.status === "eliminated" ? (
            <Badge className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-mono tracking-wider uppercase px-2 font-bold rounded-[4px]">
              Eliminated
            </Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono tracking-wider uppercase px-2 font-bold animate-pulse rounded-[4px]">
              Ongoing
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-base font-bold text-[#111827] mt-3 line-clamp-1 group-hover:text-[#6366F1] transition-colors">
          {tournament.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-5 pt-0">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#6366F1]" /> Start Date
            </span>
            <p className="font-semibold font-mono text-[#374151]">
              {tournament.start_date ? format(new Date(tournament.start_date), "MMM dd, yyyy") : "N/A"}
            </p>
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Position
            </span>
            <div className="font-bold font-mono text-[#374151] flex items-center gap-1">
              {tournament.status === "eliminated" ? (
                <span className="text-rose-700 text-[10px] line-clamp-1 font-semibold capitalize">In {tournament.eliminated_stage || "Qualifiers"}</span>
              ) : isConcluded ? (
                <span className="text-amber-600">#{tournament.final_position}</span>
              ) : (
                <span className="text-slate-400 italic font-normal">Active</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] my-3" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase block mb-0.5">
              Prize Earned
            </span>
            <p className="text-sm font-bold font-mono text-emerald-700 flex items-center">
              <DollarSign className="h-3.5 w-3.5" />
              {tournament.prize_received !== null ? tournament.prize_received.toLocaleString() : "0.00"}
            </p>
          </div>

          <Link href={`/tournaments/${tournament.id}`}>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider font-mono text-[#6366F1] hover:text-white bg-[#6366F1]/10 hover:bg-[#6366F1] py-1.5 px-3 rounded-[6px] transition-all cursor-pointer border border-[#6366F1]/20">
              Details
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
