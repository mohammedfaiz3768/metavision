"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Target, Sparkles, AlertTriangle, Loader2, ChevronRight, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types/app.types";

export default function MatchesPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();
  const router = useRouter();

  const { data: matches, isLoading: matchesLoading, error } = useQuery<Match[]>({
    queryKey: ["team-matches", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const response = await fetch(`/api/matches?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: !!currentTeam?.id,
  });

  const loading = teamLoading || matchesLoading;

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Loading scoreboard logs...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-white">
        <div className="w-12 h-12 rounded-full bg-[#1E1F28] flex items-center justify-center mb-4 border border-[#2A2B35]">
          <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
        </div>
        <p className="text-[15px] font-semibold text-white mb-1">No active roster</p>
        <p className="text-[13px] text-[#9CA3AF] mb-4">Please join or create a team to access match logs and OCR telemetry tools.</p>
        <Link href="/dashboard">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-[#111827]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Match logs</h1>
          <p className="text-[13px] text-[#4B5563] mt-1">
            Ingest and analyze competitive scrim and tournament performances.
          </p>
        </div>

        <Link href="/matches/new">
          <Button className="bg-primary hover:bg-primary/90 text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            Record Scorecard
          </Button>
        </Link>
      </div>

      {matches && matches.length > 0 ? (
        <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px] overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Match History Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E7EB] bg-slate-50/50 hover:bg-transparent">
                  <TableHead className="px-6 py-3 font-extrabold text-[#4B5563] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">Map</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#4B5563] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">Placement Rank</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#4B5563] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">Squad Kills</TableHead>
                  <TableHead className="px-4 py-3 text-right font-extrabold text-[#4B5563] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">Played At</TableHead>
                  <TableHead className="px-4 py-3 text-right font-extrabold text-[#4B5563] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB] w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E5E7EB]">
                {matches.map((m) => {
                  const dateStr = new Date(m.played_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const isTopFinish = (m.placement || 12) <= 3;

                  return (
                    <TableRow
                      key={m.id}
                      onClick={() => router.push(`/matches/${m.id}`)}
                      className="border-[#E5E7EB] hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <TableCell className="px-6 py-4 font-semibold text-xs capitalize flex items-center gap-2 text-[#111827]">
                        <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.2)]" />
                        {m.map}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 rounded-[4px] font-mono border",
                            isTopFinish
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-primary/5 text-primary border-primary/10"
                          )}
                        >
                          Rank {m.placement}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-xs font-mono font-bold text-[#111827]">{m.total_kills} kills</TableCell>
                      <TableCell className="px-4 py-4 text-right text-xs text-[#4B5563] font-medium">{dateStr}</TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <ChevronRight className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#111827] transition-colors" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Empty Board Visual */
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E5E7EB] rounded-[12px] bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
            <Target className="w-5 h-5 text-[#4B5563]" />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">No match stats recorded yet</p>
          <p className="text-[13px] text-[#4B5563] mb-4 max-w-sm">
            Record match scorecards to start monitoring placement trends, roster damage distributions, and mapping circle rotation telemetry!
          </p>
          <Link href="/matches/new">
            <Button className="bg-primary hover:bg-primary/90 text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              Ingest First Match Scorecard
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
