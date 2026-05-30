"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/types/app.types";

interface TeamWithMembership extends Team {
  membership: TeamMember;
}

async function fetchUserTeams(): Promise<TeamWithMembership[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error } = await (supabase
    .from("team_members") as any)
    .select("*, teams(*)")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!memberships) return [];

  return memberships.map((m: any) => {
    const team = m.teams as unknown as Team;
    return {
      ...team,
      membership: {
        id: m.id,
        team_id: m.team_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
      } as TeamMember,
    };
  });
}

export function useTeam() {
  const query = useQuery({
    queryKey: ["user-teams"],
    queryFn: fetchUserTeams,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const currentTeam = query.data?.[0] ?? null;
  const currentMembership = currentTeam?.membership ?? null;

  return {
    teams: query.data ?? [],
    currentTeam,
    currentMembership,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
