"use client";

import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberCard } from "@/components/team/MemberCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Loader2,
  ShieldAlert,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { TeamMember, TeamMemberDbRole } from "@/lib/types/app.types";

export default function TeamPage() {
  const { currentTeam, isLoading: teamLoading, refetch: refetchTeam } = useTeam();
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch all roster members for active team
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useQuery<any[]>({
    queryKey: ["team-members", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const { data, error } = await (supabase
        .from("team_members") as any)
        .select("*, profiles(*)")
        .eq("team_id", currentTeam.id)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentTeam,
  });

  // Role modification mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: TeamMemberDbRole;
    }) => {
      const { error } = await (supabase
        .from("team_members") as any)
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", currentTeam?.id] });
      toast.success("Roster role updated successfully");
    },
    onError: (err: any) => {
      toast.error(`Role update failed: ${err.message}`);
    },
  });

  // Kick member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase
        .from("team_members") as any)
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", currentTeam?.id] });
      toast.success("Teammate kicked from roster successfully");
    },
    onError: (err: any) => {
      toast.error(`Operation failed: ${err.message}`);
    },
  });

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_uses: 10,
          expires_in_hours: 48,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate invite token");
      }

      const res = await response.json();
      setInviteUrl(res.url);
      toast.success("Invite link generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Invite generation failed");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (teamLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading team configs...</p>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-white">
        <div className="w-12 h-12 rounded-full bg-[#1E1F28] flex items-center justify-center mb-4 border border-[#2A2B35]">
          <Users className="w-5 h-5 text-[#6B7280]" />
        </div>
        <p className="text-[15px] font-semibold text-white mb-1">No active roster</p>
        <p className="text-[13px] text-[#9CA3AF] mb-4">
          Join a team using an invite token or create one to establish a roster command center.
        </p>
        <Link href="/dashboard">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = currentTeam.owner_id === user?.id;

  return (
    <div className="space-y-6 select-none text-[#F1F1F3]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2B35]/40 pb-4 select-none">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Team Roster</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Establish operational command, assign tactical positions, and generate organizational invites.
          </p>
        </div>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left columns: Roster member lists */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#7C3AED]" />
                <span>Roster Members ({members?.length || 0})</span>
              </CardTitle>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Active tactical positions registered in this workspace.
              </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {membersLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 text-[#7C3AED] animate-spin" />
                  <p className="text-xs text-[#9CA3AF] font-mono">Loading squad lists...</p>
                </div>
              ) : !members || members.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#9CA3AF] font-mono">
                  No players registered.
                </div>
              ) : (
                members.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    isOwner={isOwner}
                    currentUserId={user?.id || ""}
                    onRemove={(id) => removeMemberMutation.mutate(id)}
                    onChangeRole={(id, r) => changeRoleMutation.mutate({ memberId: id, role: r })}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Invites & Team meta details */}
        <div className="space-y-6">
          {/* Card: Roster Invite Center */}
          {isOwner && (
            <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-[#7C3AED]" />
                  <span>Roster Invite Center</span>
                </CardTitle>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Generate tokens for players and analysts.
                </p>
              </CardHeader>
              <CardContent className="p-4.5 space-y-4 pt-5">
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Teammates with this token can register and join this squad roster. Tokens expire in 48 hours and support up to 10 uses.
                </p>

                {inviteUrl && (
                  <div className="flex gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 shrink-0 bg-[#1E1F28] hover:bg-[#7C3AED] hover:text-white border border-[#2A2B35] text-[#F1F1F3] rounded-[8px] transition-colors cursor-pointer"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-[#10B981]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold h-9 rounded-[8px] w-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {generatingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4.5 w-4.5" />
                  )}
                  Generate Token URL
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card: Org specifications */}
          <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-[#7C3AED]" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4.5 space-y-4 text-xs select-none pt-5">
              <div className="flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5 text-[#6B7280] shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[#6B7280] font-semibold text-[10px] uppercase font-mono tracking-wider">Registered</p>
                  <p className="font-semibold text-white font-mono">
                    {new Date(currentTeam.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-4.5 w-4.5 text-[#6B7280] shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[#6B7280] font-semibold text-[10px] uppercase font-mono tracking-wider">Competitive Region</p>
                  <p className="font-bold text-[#9D5FFF] uppercase font-mono">
                    {currentTeam.region || "Global"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
