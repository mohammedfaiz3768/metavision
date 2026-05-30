"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Loader2, AlertTriangle, Crosshair,
  Trophy, Shield, Swords, Calendar, Edit3,
  Save, X, Trash2, MapPin, Target, Skull,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RivalProfile, ThreatLevel, ScrimSession, ScrimRound } from "@/lib/types/app.types";

const THREAT_CONFIG: Record<ThreatLevel, { label: string; color: string }> = {
  elite: { label: "Elite", color: "bg-red-500/10 text-red-400 border border-red-500/20" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  low: { label: "Low", color: "bg-[#1E1F28] text-[#9CA3AF] border border-[#2A2B35]" },
};

interface RivalDetailResponse extends RivalProfile {
  scrim_sessions: (ScrimSession & { scrim_rounds: ScrimRound[] })[];
}

export default function RivalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rivalId = params.id as string;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editThreat, setEditThreat] = useState<ThreatLevel>("medium");

  const { data: rival, isLoading } = useQuery<RivalDetailResponse>({
    queryKey: ["rival-detail", rivalId],
    queryFn: async () => {
      const res = await fetch(`/api/rivals/${rivalId}`);
      if (!res.ok) throw new Error("Failed to fetch rival");
      return res.json();
    },
    enabled: !!rivalId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<RivalProfile>) => {
      const res = await fetch(`/api/rivals/${rivalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Rival profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["rival-detail", rivalId] });
      setIsEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/rivals/${rivalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Rival profile deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["team-rivals"] });
      router.push("/rivals");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEditing = () => {
    if (!rival) return;
    setEditNotes(rival.playstyle_notes || "");
    setEditThreat(rival.threat_level);
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <span className="text-sm text-[#9CA3AF] animate-pulse">Loading rival profile...</span>
      </div>
    );
  }

  if (!rival) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none">
        <div className="h-12 w-12 rounded-full bg-[#1E1F28] border border-[#2A2B35] flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        <h2 className="text-xl font-bold text-white">Rival not found</h2>
        <Link href="/rivals" className="mt-4">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            Back to Rivals
          </Button>
        </Link>
      </div>
    );
  }

  const sessions = rival.scrim_sessions || [];
  const threatCfg = THREAT_CONFIG[rival.threat_level] || THREAT_CONFIG.medium;

  // Compute aggregate stats across all scrim sessions
  let totalRounds = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalKills = 0;
  let totalOppKills = 0;
  const mapStats: Record<string, { rounds: number; wins: number; totalPlacement: number }> = {};

  for (const s of sessions) {
    const rounds = s.scrim_rounds || [];
    for (const r of rounds) {
      totalRounds++;
      totalKills += r.total_kills;
      totalOppKills += r.opponent_kills || 0;

      const isWin = r.opponent_placement && r.placement
        ? r.placement < r.opponent_placement
        : r.placement != null && r.placement <= 3;

      if (isWin) totalWins++;
      else totalLosses++;

      if (r.map) {
        if (!mapStats[r.map]) mapStats[r.map] = { rounds: 0, wins: 0, totalPlacement: 0 };
        mapStats[r.map].rounds++;
        if (isWin) mapStats[r.map].wins++;
        mapStats[r.map].totalPlacement += r.placement || 0;
      }
    }
  }

  const winRate = totalRounds > 0 ? ((totalWins / totalRounds) * 100).toFixed(0) : "0";
  const killDiff = totalRounds > 0 ? ((totalKills - totalOppKills) / totalRounds).toFixed(1) : "0";

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-[#F1F1F3] select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2B35]/40 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/rivals">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#2A2B35] bg-[#13141A] hover:bg-[#1E1F28] hover:text-white rounded-[8px] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-bold text-white tracking-tight">
                {rival.tag ? `${rival.tag} ` : ""}{rival.name}
              </h1>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                threatCfg.color
              )}>
                {threatCfg.label}
              </span>
            </div>
            <p className="text-[13px] text-[#9CA3AF] mt-1">
              {rival.region || "Unknown Region"} · Rival since {new Date(rival.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={startEditing}
              className="bg-[#1E1F28] border border-[#2A2B35] hover:bg-[#1A1B23] text-white text-xs h-9 rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              Edit Intel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="bg-[#13141A] border border-[#2A2B35] hover:bg-[#1E1F28] text-[#9CA3AF] hover:text-white text-xs h-9 rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate({
                  playstyle_notes: editNotes.trim() || null,
                  threat_level: editThreat,
                })}
                disabled={updateMutation.isPending}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs h-9 rounded-[8px] transition-colors px-4 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Are you sure you want to delete this rival profile? This action is irreversible.")) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="h-9 w-9 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-[8px] transition-colors flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardContent className="p-4 text-center">
            <Swords className="h-5 w-5 mx-auto mb-2 text-[#7C3AED]" />
            <div className="text-2xl font-extrabold font-mono text-white">{sessions.length}</div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 uppercase font-bold tracking-wider">Sessions</p>
          </CardContent>
        </Card>
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-2 text-[#7C3AED]" />
            <div className="text-2xl font-extrabold font-mono text-white">{totalRounds}</div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 uppercase font-bold tracking-wider">Total Rounds</p>
          </CardContent>
        </Card>
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-[#10B981]" />
            <div className="text-2xl font-extrabold font-mono text-white flex items-center justify-center">
              <span className="text-[#10B981]">{totalWins}W</span>
              <span className="text-[#6B7280] mx-1">-</span>
              <span className="text-[#EF4444]">{totalLosses}L</span>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 uppercase font-bold tracking-wider">Record</p>
          </CardContent>
        </Card>
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-[#F59E0B]" />
            <div className="text-2xl font-extrabold font-mono text-white">{winRate}%</div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 uppercase font-bold tracking-wider">Win Rate</p>
          </CardContent>
        </Card>
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <Skull className="h-5 w-5 mx-auto mb-2 text-[#9D5FFF]" />
            <div className={cn(
              "text-2xl font-extrabold font-mono text-white",
              parseFloat(killDiff) > 0 ? "text-[#10B981]" : parseFloat(killDiff) < 0 ? "text-[#EF4444]" : ""
            )}>
              {parseFloat(killDiff) > 0 ? "+" : ""}{killDiff}
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 uppercase font-bold tracking-wider">Kill Diff/Rd</p>
          </CardContent>
        </Card>
      </div>

      {/* Tactical Notes (editable) */}
      <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Tactical Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Threat Level</Label>
                <Select value={editThreat} onValueChange={(v) => setEditThreat(v as ThreatLevel)}>
                  <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 rounded-[8px] focus:ring-[#7C3AED] max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs">
                    {(["low", "medium", "high", "elite"] as ThreatLevel[]).map((l) => (
                      <SelectItem key={l} value={l} className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer capitalize">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Playstyle Notes</Label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-[#1E1F28] border border-[#2A2B35] text-white rounded-[8px] text-xs p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#7C3AED] placeholder:text-[#6B7280] leading-relaxed"
                  placeholder="Aggro push style, prefers hot drops, IGL-dependent rotations..."
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {rival.playstyle_notes || "No tactical notes recorded yet. Click 'Edit Intel' to add observations."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Map Performance Breakdown */}
      {Object.keys(mapStats).length > 0 && (
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Map Performance vs {rival.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(mapStats).map(([map, stats]) => {
                const mapWinRate = stats.rounds > 0 ? ((stats.wins / stats.rounds) * 100).toFixed(0) : "0";
                const avgPlace = stats.rounds > 0 ? (stats.totalPlacement / stats.rounds).toFixed(1) : "—";
                const isStrong = parseInt(mapWinRate) >= 60;
                const isWeak = parseInt(mapWinRate) < 40;

                return (
                  <div
                    key={map}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-all",
                      isStrong ? "border-emerald-500/20 bg-emerald-500/5 text-[#10B981]" :
                      isWeak ? "border-red-500/20 bg-red-500/5 text-[#EF4444]" :
                      "border-[#2A2B35] bg-[#1E1F28]/40 text-[#F1F1F3]"
                    )}
                  >
                    <p className="text-xs font-bold capitalize mb-1">{map}</p>
                    <p className={cn(
                      "text-xl font-extrabold font-mono",
                      isStrong ? "text-[#10B981]" : isWeak ? "text-[#EF4444]" : "text-white"
                    )}>
                      {mapWinRate}%
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] mt-1.5">
                      {stats.rounds} rd · Avg #{avgPlace}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Spots */}
      {rival.landing_spots && rival.landing_spots.length > 0 && (
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Known Landing Spots</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {rival.landing_spots.map((spot, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2A2B35] bg-[#1E1F28]/40 text-xs text-[#F1F1F3]"
                >
                  <MapPin className="h-3 w-3 text-[#7C3AED]" />
                  <span className="font-semibold capitalize">{spot.map}</span>
                  <span className="text-[#6B7280]">·</span>
                  <span>{spot.poi}</span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    ({(spot.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scrim History */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>Scrim History</span>
          {sessions.length > 0 && (
            <span className="text-xs font-mono bg-[#1E1F28] border border-[#2A2B35] text-[#9CA3AF] px-2 py-0.5 rounded-[4px] font-normal">
              {sessions.length} sessions logged
            </span>
          )}
        </h2>

        {sessions.length === 0 ? (
          <Card className="border border-[#2A2B35] bg-[#13141A]/40 p-8 text-center rounded-[12px]">
            <p className="text-xs text-[#9CA3AF]">No scrims recorded against this rival yet.</p>
            <Link href="/scrims/new" className="mt-4 inline-block">
              <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer">
                <Swords className="h-4 w-4" />
                Record Scrim
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="border border-[#2A2B35] rounded-[10px] overflow-hidden bg-[#09090C]/20 select-none">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#2A2B35] bg-[#09090C]/40 text-[9px] hover:bg-transparent">
                  <TableHead className="px-4 py-3 font-extrabold text-[#9CA3AF] uppercase tracking-wider">Date</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] uppercase tracking-wider">Rounds</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] uppercase tracking-wider">Record</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] uppercase tracking-wider">Total Kills</TableHead>
                  <TableHead className="px-4 py-3 text-center font-extrabold text-[#9CA3AF] uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#2A2B35]/40">
                {sessions.map((s) => {
                  const sRounds = s.scrim_rounds || [];
                  let sWins = 0;
                  let sLosses = 0;
                  let sKills = 0;
                  for (const r of sRounds) {
                    sKills += r.total_kills;
                    const isWin = r.opponent_placement && r.placement
                      ? r.placement < r.opponent_placement
                      : r.placement != null && r.placement <= 3;
                    if (isWin) sWins++;
                    else sLosses++;
                  }

                  return (
                    <TableRow
                      key={s.id}
                      onClick={() => router.push(`/scrims/${s.id}`)}
                      className="border-b border-[#2A2B35]/40 hover:bg-[#1E1F28]/30 cursor-pointer transition-colors text-[#F1F1F3]"
                    >
                      <TableCell className="px-4 py-3 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          {new Date(s.session_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-xs font-mono">{sRounds.length}</TableCell>
                      <TableCell className="px-4 py-3 text-center text-xs font-mono font-bold">
                        <span className="text-[#10B981]">{sWins}W</span>
                        <span className="text-[#6B7280] mx-0.5">-</span>
                        <span className="text-[#EF4444]">{sLosses}L</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-xs font-mono">{sKills}</TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase",
                          s.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          s.status === "cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {s.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

