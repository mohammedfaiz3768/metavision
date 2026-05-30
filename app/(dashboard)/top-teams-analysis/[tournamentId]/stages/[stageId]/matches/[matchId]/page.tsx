"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ReadOnlyBoard } from "@/components/analysis-board/ReadOnlyBoard";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function ObserverWhiteboardPage() {
  const params = useParams() as { tournamentId: string; stageId: string; matchId: string };
  const { tournamentId, stageId, matchId } = params;

  // Fetch strategic match data
  const { data: match, isLoading: matchLoading, error: matchError } = useQuery({
    queryKey: ["published-analysis-match", matchId],
    queryFn: async () => {
      const response = await fetch(`/api/owner/analysis/${tournamentId}/stages/${stageId}/matches/${matchId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to load strategy details");
      }
      return response.json();
    },
    enabled: !!matchId,
  });

  if (matchLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse font-mono">Loading vector arrays...</p>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none text-slate-800">
        <AlertTriangle className="h-12 w-12 text-[#EF4444] mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Failed to load strategy board</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Verify your connection and campaign authorization.
        </p>
        <Link href={`/top-teams-analysis/${tournamentId}`} className="mt-4">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm">Back to Stages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col justify-between select-none relative text-slate-800">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 select-none">
        <div className="flex items-center gap-3">
          <Link href={`/top-teams-analysis/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-[8px] transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {match.match_name} Tactical Layout
              </h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-semibold uppercase tracking-wide select-none font-mono shadow-sm">
                {match.map}
              </span>
            </div>
          </div>
        </div>

        {/* Informative notification badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-[8px] text-[10px] text-slate-600 font-mono shadow-sm">
          <Info className="h-3.5 w-3.5 text-[#6366F1] shrink-0" />
          <span>Interactive Observer Mode: Click underlined text annotations to play linked video clips</span>
        </div>
      </div>

      {/* Strategy Viewport Workspace */}
      <div className="flex-1 rounded-[12px] border border-slate-200 overflow-hidden bg-slate-900 relative shadow-sm">
        <ReadOnlyBoard mapId={match.map} canvasData={match.canvas_data} />
      </div>
    </div>
  );
}

