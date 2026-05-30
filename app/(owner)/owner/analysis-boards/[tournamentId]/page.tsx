"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Map,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

interface Match {
  id: string;
  match_name: string;
  map: string;
  is_published: boolean;
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
  created_at: string;
  analysis_stages?: Stage[];
}

export default function AnalysisTournamentDetailPage() {
  const { tournamentId } = useParams() as { tournamentId: string };
  const queryClient = useQueryClient();
  const router = useRouter();

  // Modal Dialogs Control
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  // Forms State
  const [stageName, setStageName] = useState("");
  const [stageOrder, setStageOrder] = useState<number>(1);
  const [matchName, setMatchName] = useState("");
  const [map, setMap] = useState("bermuda");

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // Fetch Tournament details
  const { data: tournament, isLoading, error } = useQuery<Tournament>({
    queryKey: ["analysis-tournament", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}`);
      if (!res.ok) throw new Error("Failed to fetch tournament folder details");
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
    mutationFn: async (payload: { name: string; stage_order: number }) => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournament", tournamentId] });
      toast.success("Strategic stage created!");
      setIsStageModalOpen(false);
      setStageName("");
      setStageOrder((prev) => prev + 1);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not add stage");
    },
  });

  // Add Match Mutation
  const addMatchMutation = useMutation({
    mutationFn: async ({
      stageId,
      payload,
    }: {
      stageId: string;
      payload: { match_name: string; map: string };
    }) => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}/stages/${stageId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create match");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournament", tournamentId] });
      toast.success("Strategic match board created!");
      setIsMatchModalOpen(false);
      setMatchName("");
      setExpandedStages((prev) => ({ ...prev, [variables.stageId]: true }));
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not log match board");
    },
  });

  // Toggle Publication status
  const togglePublishMutation = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update publication status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["published-analysis-tournament", tournamentId] });
      toast.success(data.is_published ? "Strategic roadmap published live!" : "Strategic roadmap retracted to drafts.");
    },
  });

  // Toggle Match Board Publication
  const toggleMatchPublishMutation = useMutation({
    mutationFn: async ({ stageId, matchId, isPublished }: { stageId: string; matchId: string; isPublished: boolean }) => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}/stages/${stageId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update board publication status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["published-analysis-tournament", tournamentId] });
      toast.success(data.is_published ? "Match board published live!" : "Match board retracted to drafts.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update publication");
    },
  });

  const handleAddStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;
    addStageMutation.mutate({ name: stageName, stage_order: stageOrder });
  };

  const handleAddMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStageId || !matchName.trim()) return;
    addMatchMutation.mutate({
      stageId: activeStageId,
      payload: { match_name: matchName, map },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-650 animate-pulse font-semibold">Loading campaign roadmap...</span>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-center px-4 text-slate-900 select-none">
        <Trophy className="h-10 w-10 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Campaign Folder Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          The requested strategy folder does not exist or has been removed.
        </p>
        <Link href="/owner/analysis-boards" className="mt-4">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white">Back to Strategy Campaigns</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/owner/analysis-boards">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#E5E7EB] bg-white hover:bg-slate-50 hover:text-slate-900 rounded-[8px] transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">{tournament.name}</h1>
              <Badge className={tournament.is_published ? "bg-emerald-50 text-emerald-650 border border-emerald-200/60 hover:bg-emerald-50" : "bg-amber-50 text-amber-650 border border-amber-200/60 hover:bg-amber-50"}>
                {tournament.is_published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Strategy folder created on {format(new Date(tournament.created_at), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={tournament.is_published ? "destructive" : "default"}
            disabled={togglePublishMutation.isPending}
            onClick={() => togglePublishMutation.mutate(!tournament.is_published)}
            className={`font-semibold text-xs h-8.5 gap-1.5 font-mono uppercase tracking-wider rounded-[8px] px-4 cursor-pointer transition-colors shadow-sm ${
              tournament.is_published
                ? "bg-white border border-[#E5E7EB] text-rose-600 hover:bg-rose-50/50"
                : "bg-[#10B981] hover:bg-[#059669] text-white"
            }`}
          >
            {togglePublishMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : tournament.is_published ? (
              "Retract Draft"
            ) : (
              "Publish Live"
            )}
          </Button>

          <Button
            size="sm"
            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold h-8.5 px-4 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider"
            onClick={() => setIsStageModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* Workspace Full Width Content */}
      <div className="space-y-4">
        <Card className="border border-[#E5E7EB] bg-white text-slate-800 rounded-[12px] overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
              <MapPin className="h-4.5 w-4.5 text-cyan-600" />
              Strategic Stages Accordion ({tournament.analysis_stages?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {!tournament.analysis_stages || tournament.analysis_stages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono italic">
                No stages registered. Click "Add Stage" to create stage segments.
              </div>
            ) : (
              tournament.analysis_stages.map((stage) => {
                const isExpanded = expandedStages[stage.id] ?? false;

                return (
                  <div key={stage.id} className="border border-[#E5E7EB] bg-slate-50/20 overflow-hidden rounded-[8px] mb-3">
                    {/* Stage Header */}
                    <div
                      className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => toggleStage(stage.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 font-mono">{stage.name}</h4>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Order: {stage.stage_order}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-500">{stage.analysis_matches?.length || 0} Board(s)</span>
                        <Button
                          size="xs"
                          variant="secondary"
                          className="text-[10px] font-mono font-bold h-7 gap-1 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[6px] px-3 shadow-sm cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStageId(stage.id);
                            setIsMatchModalOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" /> Add Board
                        </Button>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="border-t border-[#E5E7EB] bg-[#F9FAFB]/30 p-4 space-y-3">
                        {!stage.analysis_matches || stage.analysis_matches.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic p-3 text-center font-mono">No strategy boards recorded yet. Click "Add Board" to create.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {stage.analysis_matches.map((match) => (
                              <Card key={match.id} className="border border-[#E5E7EB] bg-white p-4 flex flex-col justify-between gap-3 hover:border-[#6366F1]/30 hover:shadow-sm hover:bg-slate-50/30 transition-all rounded-[10px] group">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-slate-400 capitalize flex items-center gap-1.5">
                                      <Map className="h-3.5 w-3.5 text-cyan-600" /> {match.map}
                                    </span>
                                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                                      match.is_published 
                                        ? "bg-emerald-50 border-emerald-250 border-emerald-100 text-emerald-600 font-bold" 
                                        : "bg-slate-50 border border-slate-200 text-slate-450 text-slate-500"
                                    }`}>
                                      {match.is_published ? "Published" : "Draft"}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-900 mt-2 leading-relaxed">{match.match_name}</h5>
                                </div>
                                
                                <div className="flex gap-2 w-full pt-1">
                                  <Link href={`/owner/analysis-boards/${tournament.id}/stages/${stage.id}/matches/${match.id}`} className="flex-1">
                                    <span className="w-full text-center inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#6366F1] hover:text-white bg-[#6366F1]/10 border border-[#6366F1]/20 hover:bg-[#6366F1] hover:border-[#6366F1] py-1.5 px-2.5 rounded-[6px] cursor-pointer transition-colors font-mono uppercase tracking-wider shadow-sm">
                                      <Eye className="h-3.5 w-3.5" /> Edit Board
                                    </span>
                                  </Link>
                                  
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={toggleMatchPublishMutation.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMatchPublishMutation.mutate({
                                        stageId: stage.id,
                                        matchId: match.id,
                                        isPublished: !match.is_published,
                                      });
                                    }}
                                    className={`text-[9px] font-mono font-semibold h-7.5 px-2 border rounded-[6px] transition-colors cursor-pointer ${
                                      match.is_published
                                        ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100/50"
                                        : "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100/50"
                                    }`}
                                  >
                                    {match.is_published ? "Retract" : "Publish"}
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG 1: ADD STAGE MODAL */}
      <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
        <DialogContent className="bg-white border border-[#E5E7EB] sm:max-w-md rounded-[12px] p-6 text-slate-800 shadow-lg">
          <form onSubmit={handleAddStageSubmit}>
            <DialogHeader className="pb-3 border-b border-[#E5E7EB]">
              <DialogTitle className="text-slate-900 font-bold text-lg">Add Campaign Stage</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Create a folder stage like Group Stage, Semis, or Grand Finals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Stage Name</Label>
                <Input
                  placeholder="e.g. Grand Finals"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  required
                  className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Stage Order</Label>
                <Input
                  type="number"
                  min="1"
                  value={stageOrder}
                  onChange={(e) => setStageOrder(parseInt(e.target.value) || 1)}
                  required
                  className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#6366F1]"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsStageModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-[#E5E7EB] rounded-[8px] text-xs h-9 px-4 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!stageName.trim()}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer h-9"
              >
                Create Stage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: LOG MATCH MODAL */}
      <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
        <DialogContent className="bg-white border border-[#E5E7EB] sm:max-w-md rounded-[12px] p-6 text-slate-800 shadow-lg">
          <form onSubmit={handleAddMatchSubmit}>
            <DialogHeader className="pb-3 border-b border-[#E5E7EB]">
              <DialogTitle className="text-slate-900 font-bold text-lg">Create Strategy Board</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Setup a new empty whiteboard match board. Select a map grid.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Match Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">Match/Board Name</Label>
                  <Input
                    placeholder="e.g. Match 1 (Bermuda)"
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    required
                    className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
                  />
                </div>

                {/* Map Select */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">Map Grid</Label>
                  <Select value={map} onValueChange={(val) => setMap(val || "bermuda")}>
                    <SelectTrigger className="bg-white border-[#E5E7EB] text-slate-800 text-xs h-9 rounded-[8px] focus:ring-[#6366F1]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E7EB] text-slate-800 text-xs">
                      {MAP_LIST.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs cursor-pointer capitalize">
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMatchModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-[#E5E7EB] rounded-[8px] text-xs h-9 px-4 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!matchName.trim()}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer h-9"
              >
                Create Board
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

