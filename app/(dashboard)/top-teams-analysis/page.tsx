"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Eye, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface AnalysisTournament {
  id: string;
  name: string;
  is_published: boolean;
  thumbnail_url?: string | null;
  created_at: string;
}

export default function TopTeamsAnalysisPage() {
  // Fetch published analysis tournaments
  const { data: tournaments, isLoading } = useQuery<AnalysisTournament[]>({
    queryKey: ["published-analysis-tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/owner/analysis");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <span className="text-sm text-[#9CA3AF] animate-pulse">Preloading professional strategy maps...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 select-none">
      {/* Header */}
      <PageHeader
        title="Top Teams Strategic Analysis"
        description="Inspect top esports teams landing spots, loot pathways, and tactical rotations compiled by executive analysts."
      />

      {/* Grid List */}
      {!tournaments || tournaments.length === 0 ? (
        <Card className="border border-slate-200 bg-white p-6 rounded-[16px] relative overflow-hidden text-center shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#6366F1] to-transparent" />
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="h-10 w-10 text-[#6366F1] mb-4" />
            <h3 className="font-bold text-sm text-slate-900">No Strategy Boards Published</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Our executive analysts are currently compiling tactical boards. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card key={t.id} className="relative overflow-hidden border border-slate-200 bg-white transition-all duration-300 group rounded-[12px] shadow-sm hover:shadow-md flex flex-col justify-between text-slate-800 hover:border-[#6366F1]/50">
              
              {/* Thumbnail Container (shows full logo inside a beautiful aspect-ratio boundary) */}
              <div className="w-full h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
                {t.thumbnail_url ? (
                  <img
                    src={t.thumbnail_url}
                    alt={t.name}
                    className="object-contain max-h-full max-w-full group-hover:scale-[1.03] transition-transform duration-500 filter drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Trophy className="h-8 w-8 text-[#6366F1] opacity-70" />
                    <span className="text-[9px] font-semibold text-[#6366F1]/70 tracking-wider uppercase font-mono">No Thumbnail</span>
                  </div>
                )}
              </div>

              {/* Details & Actions below the thumbnail */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-[#6366F1]" /> Active Strategy
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold hover:bg-emerald-100/70 shadow-none">
                      Published
                    </Badge>
                  </div>

                  <CardTitle className="text-sm font-bold text-slate-800 mt-2.5 line-clamp-2 group-hover:text-[#6366F1] transition-colors leading-tight">
                    {t.name}
                  </CardTitle>

                  <div className="text-xs mt-3 space-y-0.5">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Published Date</span>
                    <p className="font-semibold font-mono text-slate-500 text-[10px]">
                      {format(new Date(t.created_at), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-100 my-2.5" />
                  <div className="flex items-center justify-end">
                    <Link href={`/top-teams-analysis/${t.id}`}>
                      <span className="inline-flex items-center gap-1.2 text-xs font-semibold text-white hover:text-white bg-[#6366F1] hover:bg-[#4F46E5] py-1.5 px-4 rounded-[8px] transition-all cursor-pointer font-mono shadow-sm">
                        Open Campaign
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

