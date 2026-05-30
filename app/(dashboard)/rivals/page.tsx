"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlusCircle, Loader2, AlertTriangle,
  Crosshair, Shield, Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RivalProfile, ThreatLevel } from "@/lib/types/app.types";

const THREAT_CONFIG: Record<ThreatLevel, { label: string; color: string; icon: string; glow: string }> = {
  elite: {
    label: "Elite",
    color: "bg-red-500/10 text-red-400 border border-red-500/20",
    icon: "🔴",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
  },
  high: {
    label: "High",
    color: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    icon: "🟠",
    glow: "shadow-[0_0_10px_rgba(249,115,22,0.1)]",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    icon: "🟡",
    glow: "",
  },
  low: {
    label: "Low",
    color: "bg-[#1E1F28] text-[#9CA3AF] border border-[#2A2B35]",
    icon: "⚪",
    glow: "",
  },
};

export default function RivalsPage() {
  const { currentTeam } = useTeam();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newThreat, setNewThreat] = useState<ThreatLevel>("medium");
  const [newPlaystyle, setNewPlaystyle] = useState("");

  const { data: rivals, isLoading } = useQuery<RivalProfile[]>({
    queryKey: ["team-rivals", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const res = await fetch(`/api/rivals?team_id=${currentTeam.id}`);
      if (!res.ok) throw new Error("Failed to fetch rivals");
      return res.json();
    },
    enabled: !!currentTeam?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: currentTeam?.id,
          name: newName.trim(),
          tag: newTag.trim() || null,
          threat_level: newThreat,
          playstyle_notes: newPlaystyle.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create rival");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Rival profile created successfully!");
      queryClient.invalidateQueries({ queryKey: ["team-rivals"] });
      setShowCreate(false);
      setNewName("");
      setNewTag("");
      setNewThreat("medium");
      setNewPlaystyle("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <span className="text-sm text-[#9CA3AF] animate-pulse">Loading rival profiles...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none">
        <div className="h-12 w-12 rounded-full bg-[#1E1F28] border border-[#2A2B35] flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        <h2 className="text-xl font-bold text-white">No active roster</h2>
        <p className="text-sm text-[#9CA3AF] mt-1 max-w-sm">
          Please join or create a team to manage rival profiles.
        </p>
        <Link href="/dashboard" className="mt-4">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#F1F1F3] select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2B35]/40 pb-4">
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-bold text-white tracking-tight">Rival Directory</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Build competitive intelligence profiles on opposing organizations.
          </p>
        </div>

        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Add Rival
        </Button>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-[#13141A] border border-[#2A2B35] max-w-md rounded-[12px] p-6 text-[#F1F1F3]">
            <DialogHeader className="pb-3 border-b border-[#2A2B35]/40">
              <DialogTitle className="text-white font-bold text-lg">Add Rival Profile</DialogTitle>
              <DialogDescription className="text-xs text-[#9CA3AF] mt-1">
                Create a tactical intelligence profile for an opposing team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Team Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Team Omega"
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#9CA3AF]">Clan Tag</Label>
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g., [OMG]"
                    className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Threat Level</Label>
                <Select value={newThreat} onValueChange={(v) => setNewThreat(v as ThreatLevel)}>
                  <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 rounded-[8px] focus:ring-[#7C3AED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs">
                    {(Object.keys(THREAT_CONFIG) as ThreatLevel[]).map((level) => (
                      <SelectItem key={level} value={level} className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">
                        {THREAT_CONFIG[level].icon} {THREAT_CONFIG[level].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Playstyle Notes</Label>
                <textarea
                  value={newPlaystyle}
                  onChange={(e) => setNewPlaystyle(e.target.value)}
                  placeholder="Aggressive early-game, passive rotators, sniper-heavy comp..."
                  rows={2}
                  className="w-full bg-[#1E1F28] border border-[#2A2B35] text-white rounded-[8px] text-xs p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#7C3AED] placeholder:text-[#6B7280] leading-relaxed"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-[#2A2B35]/40 pt-4 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowCreate(false)}
                className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Rival
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rivals Grid */}
      {rivals && rivals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rivals.map((rival) => {
            const threat = THREAT_CONFIG[rival.threat_level] || THREAT_CONFIG.medium;
            const mapCount = rival.preferred_maps?.length || 0;

            return (
              <Card
                key={rival.id}
                onClick={() => router.push(`/rivals/${rival.id}`)}
                className={cn(
                  "border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm hover:bg-[#1A1B23] cursor-pointer transition-all duration-200 group relative overflow-hidden rounded-[12px]",
                  threat.glow
                )}
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#7C3AED]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7C3AED]/15 to-[#7C3AED]/5 border border-[#7C3AED]/20 flex items-center justify-center">
                        <Crosshair className="h-5 w-5 text-[#7C3AED]" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-white">
                          {rival.tag ? `${rival.tag} ` : ""}{rival.name}
                        </CardTitle>
                        {rival.region && (
                          <CardDescription className="text-[10px] text-[#9CA3AF] mt-0.5">{rival.region}</CardDescription>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1",
                      threat.color
                    )}>
                      <span>{threat.icon}</span>
                      <span>{threat.label}</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {rival.playstyle_notes && (
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2 mb-3 leading-relaxed">
                      {rival.playstyle_notes}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF] border-t border-[#2A2B35]/40 pt-3">
                    {mapCount > 0 && (
                      <span className="flex items-center gap-1 bg-[#1E1F28]/50 border border-[#2A2B35]/40 px-2 py-0.5 rounded-[4px]">
                        <Shield className="h-3 w-3 text-[#7C3AED]" />
                        <span>{mapCount} preferred map{mapCount !== 1 ? "s" : ""}</span>
                      </span>
                    )}
                    {rival.landing_spots && rival.landing_spots.length > 0 && (
                      <span className="flex items-center gap-1 bg-[#1E1F28]/50 border border-[#2A2B35]/40 px-2 py-0.5 rounded-[4px]">
                        <Eye className="h-3 w-3 text-[#10B981]" />
                        <span>{rival.landing_spots.length} known drop{rival.landing_spots.length !== 1 ? "s" : ""}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="border border-[#2A2B35] bg-gradient-to-br from-[#13141A]/60 via-[#13141A]/30 to-background/5 p-6 rounded-[16px] relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#7C3AED] to-transparent" />
          <CardHeader className="space-y-3 max-w-xl mx-auto py-8">
            <div className="h-12 w-12 rounded-full bg-[#1E1F28] border border-[#2A2B35] flex items-center justify-center mx-auto text-[#7C3AED]">
              <Crosshair className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-white">No rival profiles yet</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-[#9CA3AF]">
              Create tactical profiles of opposing organizations to track their tendencies, landing preferences, and historical scrim performance against your roster.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer mx-auto"
            >
              <PlusCircle className="h-4 w-4" />
              Create First Rival Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

