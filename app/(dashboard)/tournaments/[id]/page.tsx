"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MAP_LIST } from "@/lib/whiteboard/map-config";
import {
  Loader2,
  Trophy,
  Plus,
  Calendar,
  DollarSign,
  Medal,
  Award,
  Trash2,
  Swords,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

interface Match {
  id: string;
  match_name: string;
  map: string;
  placement: number;
  kills: number;
  placement_points: number;
  kill_points: number;
  total_match_points: number;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  total_matches: number;
  status: "ongoing" | "qualified" | "eliminated";
  tournament_matches?: Match[];
}

interface Tournament {
  id: string;
  name: string;
  type: "official" | "unofficial";
  prize_pool_type: "top3" | "top5" | "top12";
  start_date: string | null;
  final_position: number | null;
  prize_received: number | null;
  status: "ongoing" | "concluded" | "eliminated";
  eliminated_stage: string | null;
  tournament_stages?: Stage[];
}

export default function TournamentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dialog State controls
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);

  // Form State controls
  const [stageName, setStageName] = useState("");
  const [stageOrder, setStageOrder] = useState<number>(1);

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [matchName, setMatchName] = useState("");
  const [map, setMap] = useState("bermuda");
  const [placement, setPlacement] = useState<number>(1);
  const [kills, setKills] = useState<string>("");

  const [finalPosition, setFinalPosition] = useState<number>(1);
  const [prizeReceived, setPrizeReceived] = useState<string>("");

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  const [totalMatches, setTotalMatches] = useState<number>(6);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStageStatusUpdate = async (stageId: string, status: "qualified" | "eliminated") => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/stages/${stageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stage status");
      }

      toast.success(
        status === "qualified"
          ? "Congratulations! Squad qualified for the next stage."
          : `Stage concluded. Squad marked as eliminated in this stage.`
      );
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    } catch (err: any) {
      toast.error(err.message || "Could not update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Tournament Details
  const { data: tournament, isLoading, error } = useQuery<Tournament>({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) throw new Error("Failed to fetch tournament detail");
      return res.json();
    },
  });

  // Toggle stage accordion
  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Add Stage Mutation
  const addStageMutation = useMutation({
    mutationFn: async (payload: { name: string; stage_order: number; total_matches: number }) => {
      const res = await fetch(`/api/tournaments/${id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      toast.success("Stage added successfully!");
      setIsStageModalOpen(false);
      setStageName("");
      setTotalMatches(6);
      setStageOrder((prev) => prev + 1);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not add stage");
    },
  });

  // Log Match Mutation
  const addMatchMutation = useMutation({
    mutationFn: async ({
      stageId,
      payload,
    }: {
      stageId: string;
      payload: { match_name: string; map: string; placement: number; kills: number };
    }) => {
      const res = await fetch(`/api/tournaments/${id}/stages/${stageId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to log match");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      toast.success("Match scorecard logged successfully!");
      setIsMatchModalOpen(false);
      setMatchName("");
      setKills("");
      // Keep accordion open
      setExpandedStages((prev) => ({ ...prev, [variables.stageId]: true }));
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not log match");
    },
  });

  // Conclude Tournament Mutation
  const concludeTournamentMutation = useMutation({
    mutationFn: async (payload: { final_position: number; prize_received: number }) => {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to conclude tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament concluded successfully!");
      setIsConcludeModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not conclude tournament");
    },
  });

  // Delete Tournament Mutation
  const deleteTournamentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tournament");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Tournament record deleted");
      router.push("/tournaments");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not delete tournament");
    },
  });

  // Form Submissions
  const handleAddStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;
    addStageMutation.mutate({ name: stageName, stage_order: stageOrder, total_matches: totalMatches });
  };

  const handleAddMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStageId || !matchName.trim()) return;
    const parsedKills = parseInt(kills);
    if (isNaN(parsedKills) || parsedKills < 0) {
      toast.error("Please enter a valid kills amount");
      return;
    }
    addMatchMutation.mutate({
      stageId: activeStageId,
      payload: {
        match_name: matchName,
        map,
        placement,
        kills: parsedKills,
      },
    });
  };

  const handleConcludeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrize = parseFloat(prizeReceived);
    if (isNaN(parsedPrize) || parsedPrize < 0) {
      toast.error("Please enter a valid prize amount");
      return;
    }
    concludeTournamentMutation.mutate({
      final_position: finalPosition,
      prize_received: parsedPrize,
    });
  };

  const handleDeleteTournament = () => {
    if (window.confirm("Are you sure you want to delete this tournament? All stages and matches will be lost forever.")) {
      deleteTournamentMutation.mutate();
    }
  };

  // Computes cumulative totals across all stages
  const totals = (() => {
    if (!tournament?.tournament_stages) return { matches: 0, kills: 0, points: 0 };
    let matchesCount = 0;
    let killsSum = 0;
    let pointsSum = 0;

    for (const stage of tournament.tournament_stages) {
      if (stage.tournament_matches) {
        for (const m of stage.tournament_matches) {
          matchesCount++;
          killsSum += m.kills;
          pointsSum += m.total_match_points;
        }
      }
    }

    return { matches: matchesCount, kills: killsSum, points: pointsSum };
  })();

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Reconstructing tournament timeline...</span>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Trophy className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Tournament Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          The requested tournament record could not be fetched or has been removed.
        </p>
        <Link href="/tournaments" className="mt-4">
          <Button>Back to Tournaments</Button>
        </Link>
      </div>
    );
  }

  const isConcluded = tournament.final_position !== null;

  return (
    <div className="space-y-6 select-none text-[#F1F1F3]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2B35]/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link href="/tournaments">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#2A2B35] bg-[#13141A] hover:bg-[#1E1F28] hover:text-white rounded-[8px] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={
                  tournament.type === "official"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-mono tracking-wider font-extrabold uppercase px-2 rounded-[4px]"
                    : "border-sky-500/30 bg-sky-500/10 text-sky-400 text-[10px] font-mono tracking-wider font-extrabold uppercase px-2 rounded-[4px]"
                }
              >
                {tournament.type}
              </Badge>
              <Badge className="bg-[#7C3AED]/10 text-[#9D5FFF] border border-[#7C3AED]/20 text-[10px] font-mono font-bold uppercase px-2 rounded-[4px]">
                Payout: {tournament.prize_pool_type.toUpperCase()}
              </Badge>
              <Badge
                className={
                  tournament.status === "concluded" || isConcluded
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase px-2 rounded-[4px]"
                    : tournament.status === "eliminated"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold uppercase px-2 font-extrabold rounded-[4px]"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase px-2 animate-pulse rounded-[4px]"
                }
              >
                Status: {tournament.status === "eliminated" ? `Eliminated in ${tournament.eliminated_stage || "Qualifiers"}` : tournament.status || "ongoing"}
              </Badge>
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">{tournament.name}</h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1">
              {tournament.start_date
                ? `Championship campaign started on ${format(new Date(tournament.start_date), "MMMM dd, yyyy")}`
                : "Active tournament scoreboard logs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tournament.status === "ongoing" && !isConcluded && (
            <Button
              className="bg-emerald-650 hover:bg-emerald-700 text-white font-semibold text-xs h-9 uppercase tracking-wider px-4 rounded-[8px] transition-colors cursor-pointer"
              onClick={() => setIsConcludeModalOpen(true)}
            >
              <Award className="h-4 w-4 mr-2" />
              Conclude Tournament
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-9 w-9 border border-rose-550/20 text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition-colors cursor-pointer"
            onClick={handleDeleteTournament}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Grid: Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Campaign Points */}
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px]">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Total Tournament Points
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-amber-400">{totals.points}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Placement + frag points combined</p>
          </CardContent>
        </Card>

        {/* Total Matches */}
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px]">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase flex items-center gap-1">
              <Swords className="h-3 w-3 text-sky-400" /> Matches Logged
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-white">{totals.matches}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Across all registered stages</p>
          </CardContent>
        </Card>

        {/* Total Kills */}
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px]">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase flex items-center gap-1">
              <Medal className="h-3 w-3 text-[#7C3AED]" /> Cumulative Kills
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight text-white">{totals.kills}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Total squad eliminations recorded</p>
          </CardContent>
        </Card>

        {/* Final Standings / Payout */}
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px]">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-[#9CA3AF] uppercase flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-400" /> Financial Outcome
            </span>
          </CardHeader>
          <CardContent>
            {isConcluded ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-emerald-400 font-mono">
                    +${tournament.prize_received?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">Prize money earned</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                  Rank #{tournament.final_position}
                </Badge>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-[#9CA3AF] italic">Tournament Active</p>
                <p className="text-[10px] text-[#6B7280] mt-1">Conclude campaign to log prize pools</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stages Section Header */}
      <div className="flex items-center justify-between border-b border-[#2A2B35]/40 pb-3 mt-8">
        <h2 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2 font-mono">
          <Trophy className="h-4.5 w-4.5 text-[#7C3AED]" />
          Tournament Stages ({tournament.tournament_stages?.length || 0})
        </h2>
        {tournament.status === "ongoing" && !isConcluded && (
          <Button
            size="sm"
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold h-8 gap-1.5 rounded-[8px] transition-colors cursor-pointer"
            onClick={() => setIsStageModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Stage
          </Button>
        )}
      </div>

      {/* Stages List & Accordions */}
      {!tournament.tournament_stages || tournament.tournament_stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#2A2B35] rounded-[12px] bg-[#13141A]/60">
          <div className="w-12 h-12 rounded-full bg-[#1E1F28] flex items-center justify-center mb-4 border border-[#2A2B35]">
            <Trophy className="w-5 h-5 text-[#6B7280]" />
          </div>
          <p className="text-[15px] font-semibold text-white mb-1">No Stages Created</p>
          <p className="text-[13px] text-[#9CA3AF] mb-4 max-w-sm">
            Create stages like "Qualifiers", "Play-Ins", or "Grand Finals" to organize matches.
          </p>
          <Button
            size="sm"
            onClick={() => setIsStageModalOpen(true)}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold h-8 gap-1.5 rounded-[8px] transition-colors cursor-pointer"
          >
            Add First Stage
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tournament.tournament_stages.map((stage) => {
            const isExpanded = expandedStages[stage.id] ?? false;
            
            // Calculate stage points
            let stagePoints = 0;
            let stageKills = 0;
            if (stage.tournament_matches) {
              for (const m of stage.tournament_matches) {
                stagePoints += m.total_match_points;
                stageKills += m.kills;
              }
            }

            return (
              <Card key={stage.id} className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm overflow-hidden rounded-[12px]">
                {/* Accordion Trigger Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1E1F28]/20 transition-colors select-none"
                  onClick={() => toggleStage(stage.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="h-4.5 w-4.5 text-[#9CA3AF]" /> : <ChevronDown className="h-4.5 w-4.5 text-[#9CA3AF]" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{stage.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            stage.status === "qualified"
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono capitalize px-1.5 py-0 rounded-[4px]"
                              : stage.status === "eliminated"
                              ? "border-rose-500/35 bg-rose-500/10 text-rose-400 text-[9px] font-mono capitalize px-1.5 py-0 font-bold rounded-[4px]"
                              : "border-amber-500/35 bg-amber-500/10 text-amber-400 text-[9px] font-mono capitalize px-1.5 py-0 rounded-[4px]"
                          }
                        >
                          {stage.status || "ongoing"}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider mt-0.5 block">
                        Stage Order: {stage.stage_order} | Matches: {stage.tournament_matches?.length || 0}/{stage.total_matches}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-[#9CA3AF] uppercase block">Stage Points</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">{stagePoints} pts</span>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] font-mono text-[#9CA3AF] uppercase block">Stage Frags</span>
                      <span className="text-xs font-semibold text-white font-mono">{stageKills} kills</span>
                    </div>
                    {(stage.tournament_matches?.length || 0) < stage.total_matches && tournament.status === "ongoing" && (
                      <Button
                        size="sm"
                        className="text-xs h-7 gap-1 px-2.5 font-bold bg-[#1E1F28] hover:bg-[#7C3AED] hover:text-white border border-[#2A2B35] text-[#F1F1F3] rounded-[8px] transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid accordion toggle
                          setActiveStageId(stage.id);
                          setIsMatchModalOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        Log Match
                      </Button>
                    )}
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-[#2A2B35]/40 p-0 bg-[#09090C]/10">
                    {!stage.tournament_matches || stage.tournament_matches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#9CA3AF] font-mono">
                        No matches recorded in this stage yet. Click "Log Match" to enter results.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#2A2B35] bg-[#09090C]/35 hover:bg-transparent text-[9px] uppercase font-mono">
                            <TableHead className="px-6 py-3 font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Match Name</TableHead>
                            <TableHead className="px-4 py-3 font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Map</TableHead>
                            <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Placement</TableHead>
                            <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Placement Points</TableHead>
                            <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Kills</TableHead>
                            <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Kill Points</TableHead>
                            <TableHead className="px-6 py-3 text-right font-extrabold text-[#9CA3AF] tracking-wider border-b border-[#2A2B35]">Total Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-[#2A2B35]/30">
                          {stage.tournament_matches.map((m) => (
                            <TableRow key={m.id} className="border-[#2A2B35]/30 hover:bg-[#1E1F28]/25 text-xs transition-colors">
                              <TableCell className="px-6 py-3.5 font-semibold text-white">{m.match_name}</TableCell>
                              <TableCell className="px-4 py-3.5 font-semibold text-[#9CA3AF] capitalize">{m.map}</TableCell>
                              <TableCell className="px-4 py-3.5 text-center font-mono">
                                <span className={m.placement <= 3 ? "text-amber-400 font-bold" : "text-white"}>
                                  #{m.placement}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3.5 text-center text-[#9CA3AF] font-mono">{m.placement_points}</TableCell>
                              <TableCell className="px-4 py-3.5 text-center font-mono text-white">{m.kills}</TableCell>
                              <TableCell className="px-4 py-3.5 text-center text-[#9CA3AF] font-mono">{m.kill_points}</TableCell>
                              <TableCell className="px-6 py-3.5 text-right font-bold text-[#9D5FFF] font-mono">{m.total_match_points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {stage.tournament_matches && stage.tournament_matches.length === stage.total_matches && stage.status === "ongoing" && tournament.status === "ongoing" && (
                      <div className="p-6 border-t border-[#2A2B35]/40 bg-[#7C3AED]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-left">
                          <h4 className="text-sm font-bold text-[#9D5FFF] flex items-center gap-1.5 font-mono">
                            <Trophy className="h-4.5 w-4.5 animate-bounce text-amber-500" /> Stage Match Limit Reached ({stage.total_matches}/{stage.total_matches})
                          </h4>
                          <p className="text-xs text-[#9CA3AF]">
                            All scheduled match scorecards for <strong>{stage.name}</strong> are successfully logged. Did your squad qualify for the next stage?
                          </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-4 flex-1 sm:flex-none font-mono rounded-[8px] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageStatusUpdate(stage.id, "qualified");
                            }}
                            disabled={isUpdatingStatus}
                          >
                            Yes, Qualified
                          </Button>
                          <Button
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 px-4 flex-1 sm:flex-none font-mono rounded-[8px] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageStatusUpdate(stage.id, "eliminated");
                            }}
                            disabled={isUpdatingStatus}
                          >
                            No, Eliminated
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* DIALOG 1: ADD STAGE MODAL */}
      <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
        <DialogContent className="border border-[#2A2B35] bg-[#13141A] text-[#F1F1F3] rounded-[12px] sm:max-w-md">
          <form onSubmit={handleAddStageSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Add Tournament Stage</DialogTitle>
              <DialogDescription className="text-xs text-[#9CA3AF]">
                Add an expandable segment of matches, such as Qualifiers, Semis, or Grand Finals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Stage Name</Label>
                <Input
                  placeholder="e.g. Grand Finals"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  required
                  className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Stage Order</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stageOrder}
                    onChange={(e) => setStageOrder(parseInt(e.target.value) || 1)}
                    required
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Total Stage Matches</Label>
                  <Input
                    type="number"
                    min="1"
                    value={totalMatches}
                    onChange={(e) => setTotalMatches(parseInt(e.target.value) || 6)}
                    required
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] text-left leading-normal">
                Stage order specifies sequencing (1 = Qualifiers, 2 = Semis). Total matches bounds logging.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsStageModalOpen(false)} className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] transition-colors">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!stageName.trim()} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold px-4 py-2 rounded-[8px] transition-colors cursor-pointer">
                Create Stage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: LOG MATCH MODAL */}
      <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
        <DialogContent className="border border-[#2A2B35] bg-[#13141A] text-[#F1F1F3] rounded-[12px] sm:max-w-md">
          <form onSubmit={handleAddMatchSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Log Match Scorecard</DialogTitle>
              <DialogDescription className="text-xs text-[#9CA3AF]">
                Enter your squad's map placement and kill stats. Placement points are calculated automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Match Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Match Name</Label>
                  <Input
                    placeholder="e.g. Match 1"
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    required
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>

                {/* Map Select */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Map</Label>
                  <Select value={map} onValueChange={(val) => setMap(val || "bermuda")}>
                    <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 rounded-[8px] focus:ring-[#7C3AED]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-white">
                      {MAP_LIST.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs capitalize cursor-pointer hover:bg-[#7C3AED]/20">
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Placement */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Placement Finish (1-12)</Label>
                  <Select value={String(placement)} onValueChange={(val) => setPlacement(Number(val))}>
                    <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 font-mono rounded-[8px] focus:ring-[#7C3AED]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-white font-mono text-xs">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={String(num)} className="cursor-pointer hover:bg-[#7C3AED]/20">
                          Rank #{num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kills */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Team Kills</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 8"
                    value={kills}
                    onChange={(e) => setKills(e.target.value)}
                    required
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsMatchModalOpen(false)} className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] transition-colors">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!matchName.trim() || !kills.trim()} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold px-4 py-2 rounded-[8px] transition-colors cursor-pointer">
                Log Scorecard
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: CONCLUDE TOURNAMENT MODAL */}
      <Dialog open={isConcludeModalOpen} onOpenChange={setIsConcludeModalOpen}>
        <DialogContent className="border border-[#2A2B35] bg-[#13141A] text-[#F1F1F3] rounded-[12px] sm:max-w-md">
          <form onSubmit={handleConcludeSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Conclude Campaign Winnings</DialogTitle>
              <DialogDescription className="text-xs text-[#9CA3AF]">
                Conclude this tournament by specifying your team's overall standings placement and actual cash rewards received.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Final Position */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Final Standings Rank</Label>
                  <Select value={String(finalPosition)} onValueChange={(val) => setFinalPosition(Number(val))}>
                    <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 font-mono rounded-[8px] focus:ring-[#7C3AED]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-white font-mono text-xs">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={String(num)} className="cursor-pointer hover:bg-[#7C3AED]/20">
                          Rank #{num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prize Received */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Prize Earnings Received ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000.00"
                    value={prizeReceived}
                    onChange={(e) => setPrizeReceived(e.target.value)}
                    required
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsConcludeModalOpen(false)} className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] transition-colors">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!prizeReceived.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-[8px] transition-colors cursor-pointer">
                Conclude Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
