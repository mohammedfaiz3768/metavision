"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "./RoleBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, ShieldAlert, UserMinus, Shield } from "lucide-react";
import type { TeamMember, TeamMemberDbRole } from "@/lib/types/app.types";

interface MemberCardProps {
  member: TeamMember & {
    profiles?: {
      username: string;
      avatar_url: string | null;
      email?: string;
    };
  };
  isOwner: boolean;
  currentUserId: string;
  onRemove: (memberId: string) => void;
  onChangeRole: (memberId: string, role: TeamMemberDbRole) => void;
}

const ROLES: TeamMemberDbRole[] = ["coach", "analyst", "IGL", "entry", "support", "sniper", "player"];

export function MemberCard({
  member,
  isOwner,
  currentUserId,
  onRemove,
  onChangeRole,
}: MemberCardProps) {
  const profile = member.profiles;
  const username = profile?.username || "Teammate";
  const initials = username.slice(0, 2).toUpperCase();
  const isSelf = member.user_id === currentUserId;

  return (
    <div className="flex items-center justify-between p-4.5 rounded-[12px] border border-[#2A2B35] bg-[#13141A]/60 hover:bg-[#1E1F28]/20 transition-all select-none">
      {/* Profile info left side */}
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar className="h-10 w-10 border border-[#2A2B35]">
          <AvatarImage src={profile?.avatar_url || ""} alt={username} />
          <AvatarFallback className="bg-[#1E1F28] text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate max-w-[130px]">
              {username}
            </span>
            {isSelf && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#9D5FFF] font-bold">
                You
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#9CA3AF] truncate leading-normal mt-0.5">
            Joined {new Date(member.joined_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Roster role actions right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Role Badge */}
        <RoleBadge role={member.role} />

        {/* Admin settings controls dropdown (only visible to team owners on other players) */}
        {isOwner && !isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[6px]"
              >
                <MoreVertical className="h-4.5 w-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 border border-[#2A2B35] bg-[#13141A] text-[#F1F1F3]" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-[#9CA3AF]">Adjust Roster Role</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-[#2A2B35]" />
              {ROLES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onChangeRole(member.id, r)}
                  className="capitalize font-medium text-xs cursor-pointer hover:bg-[#1E1F28] hover:text-white"
                >
                  <Shield className="mr-2 h-3.5 w-3.5 text-[#7C3AED]" />
                  <span>Set as {r}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#2A2B35]" />
              <DropdownMenuItem
                onClick={() => onRemove(member.id)}
                className="text-rose-500 font-bold text-xs focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer"
              >
                <UserMinus className="mr-2 h-3.5 w-3.5" />
                <span>Kick from squad</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
