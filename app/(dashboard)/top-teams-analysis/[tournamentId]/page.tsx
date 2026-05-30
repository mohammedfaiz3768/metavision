"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadOnlyBoard } from "@/components/analysis-board/ReadOnlyBoard";
import { MAP_LIST } from "@/lib/whiteboard/map-config";
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Eye,
  ExternalLink,
  MapPin,
  Map,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Match {
  id: string;
  match_name: string;
  map: string;
  canvas_data: any;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  analysis_matches?: Match[];
}

interface Tournament {
  id: string;
  name: string;
  is_published: boolean;
  thumbnail_url?: string | null;
  created_at: string;
  analysis_stages?: Stage[];
}

export default function TopTeamsTournamentDetailPage() {
  const { tournamentId } = useParams() as { tournamentId: string };
  
  // Navigation filters
  const [selectedStageFilter, setSelectedStageFilter] = useState("all");
  const [selectedMapFilter, setSelectedMapFilter] = useState("all");

  // Fetch Tournament details
  const { data: tournament, isLoading, error } = useQuery<Tournament>({
    queryKey: ["published-analysis-tournament", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}`);
      if (!res.ok) throw new Error("Failed to fetch campaign details");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <span className="text-sm text-[#9CA3AF] animate-pulse font-mono">Reconstructing strategic stages...</span>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none text-[#F1F1F3]">
        <Trophy className="h-10 w-10 text-[#EF4444] mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Campaign Not Found</h2>
        <p className="text-sm text-[#9CA3AF] mt-1 max-w-sm">
          The requested strategy folder does not exist or has not been published yet.
        </p>
        <Link href="/top-teams-analysis" className="mt-4">
          <Button className="bg-[#1E1F28] border border-[#2A2B35] text-white">Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  // Flatten matches for easy grid rendering, filtering, and sorting
  const allMatches = tournament.analysis_stages
    ? tournament.analysis_stages.flatMap((stage) =>
        (stage.analysis_matches || [])
          .filter((m: any) => m.is_published)
          .map((m) => ({
            ...m,
            stageName: stage.name,
            stageId: stage.id,
          }))
      )
    : [];

  const filteredMatches = allMatches.filter((m) => {
    const stageMatch = selectedStageFilter === "all" || m.stageId === selectedStageFilter;
    const mapMatch = selectedMapFilter === "all" || m.map === selectedMapFilter;
    return stageMatch && mapMatch;
  });

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Campaign Banner Header */}
      {tournament.thumbnail_url && (
        <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-[12px] flex items-center justify-center p-4 relative overflow-hidden select-none shadow-sm">
          <img
            src={tournament.thumbnail_url}
            alt={tournament.name}
            className="object-contain max-h-full max-w-full filter drop-shadow-sm"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/top-teams-analysis">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-[8px] transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">{tournament.name}</h1>
              <Badge className="bg-emerald-550/10 bg-emerald-50 text-emerald-650 border border-emerald-200/60 text-[10px] font-mono font-bold">
                Published
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Strategy folder released on {format(new Date(tournament.created_at), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3.5 p-4 rounded-[12px] border border-slate-200 bg-slate-50 shadow-sm">
          {/* Stage Filters */}
          {tournament.analysis_stages && tournament.analysis_stages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-2 font-bold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#6366F1]" /> Stages:
              </span>
              <button
                type="button"
                onClick={() => setSelectedStageFilter("all")}
                className={`px-3 py-1 text-xs font-mono rounded-[8px] transition-colors border cursor-pointer ${
                  selectedStageFilter === "all"
                    ? "bg-[#6366F1] border-[#6366F1] text-white font-bold shadow-sm"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                All Stages
              </button>
              {tournament.analysis_stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStageFilter(stage.id)}
                  className={`px-3 py-1 text-xs font-mono rounded-[8px] transition-colors border cursor-pointer ${
                    selectedStageFilter === stage.id
                      ? "bg-[#6366F1] border-[#6366F1] text-white font-bold shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          )}

          {/* Map Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-2 font-bold flex items-center gap-1.5">
              <Map className="h-3.5 w-3.5 text-[#6366F1]" /> Maps:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMapFilter("all")}
              className={`px-2.5 py-0.5 text-[10px] font-mono rounded-full transition-colors border cursor-pointer ${
                selectedMapFilter === "all"
                  ? "bg-[#6366F1] border-[#6366F1] text-white font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              All Maps
            </button>
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMapFilter(m.id)}
                className={`px-2.5 py-0.5 text-[10px] font-mono rounded-full transition-colors border capitalize cursor-pointer ${
                  selectedMapFilter === m.id
                    ? "bg-[#6366F1] border-[#6366F1] text-white font-bold shadow-sm"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {m.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Live Grid of Maps */}
        {filteredMatches.length === 0 ? (
          <Card className="border border-slate-200 bg-white text-center p-12 rounded-[12px] shadow-sm">
            <CardContent className="text-xs text-slate-400 font-mono italic">
              No matching strategy maps published under these filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <Card key={match.id} className="border border-slate-200 bg-white overflow-hidden hover:border-[#6366F1]/30 hover:shadow-md transition-all duration-200 flex flex-col group relative rounded-[12px] shadow-sm">
                {/* Canvas Viewport thumbnail */}
                <div className="h-[280px] w-full relative overflow-hidden bg-slate-100 border-b border-slate-200">
                  <ReadOnlyBoard mapId={match.map as any} canvasData={match.canvas_data} interactive={false} />
                  
                  {/* Open details icon overlay */}
                  <Link href={`/top-teams-analysis/${tournamentId}/stages/${match.stageId}/matches/${match.id}`} className="absolute bottom-3 right-3 z-20">
                    <span className="h-8.5 w-8.5 rounded-[8px] bg-white/95 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#6366F1] hover:bg-slate-50 transition-colors cursor-pointer shadow-md">
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
                
                {/* Card Info details */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3 text-slate-800 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="bg-cyan-50 text-cyan-650 border border-cyan-200/60 text-[9px] font-mono capitalize py-0 px-1.5 rounded-[4px] shadow-sm hover:bg-cyan-50">
                        {match.map}
                      </Badge>
                      <Badge className="bg-indigo-50 text-indigo-650 border border-indigo-200/60 text-[9px] font-mono py-0 px-1.5 rounded-[4px] shadow-sm hover:bg-indigo-50">
                        {match.stageName}
                      </Badge>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-[#6366F1] transition-colors line-clamp-1">
                      {match.match_name}
                    </h3>
                  </div>
                  
                  <Link href={`/top-teams-analysis/${tournamentId}/stages/${match.stageId}/matches/${match.id}`} className="w-full">
                    <span className="w-full text-center inline-flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6366F1] hover:text-white bg-[#6366F1]/10 border border-[#6366F1]/20 hover:bg-[#6366F1] hover:border-[#6366F1] py-1.5 px-3 rounded-[6px] cursor-pointer transition-colors shadow-sm">
                      <Eye className="h-3.5 w-3.5" /> View Strategy Board
                    </span>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

