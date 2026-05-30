import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify owner authorization
    const { data: membership, error: membershipError } = await (supabase
      .from("owner_team_members") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden — Owner Access Only" }, { status: 403 });
    }

    // 1. Total registrations count
    const { count: totalRegistrations, error: countError } = await (supabase
      .from("profiles") as any)
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    // 2. Fetch all profiles to compute registration trend over last 6 months
    const { data: profiles, error: profilesError } = await (supabase
      .from("profiles") as any)
      .select("id, created_at, role, username");

    if (profilesError) throw profilesError;

    // Compile registration trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrendMap: Record<string, number> = {};

    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyTrendMap[key] = 0;
    }

    if (profiles) {
      for (const p of profiles) {
        const pDate = new Date(p.created_at);
        const key = `${months[pDate.getMonth()]} ${pDate.getFullYear().toString().substring(2)}`;
        if (key in monthlyTrendMap) {
          monthlyTrendMap[key]++;
        }
      }
    }

    const registrationTrend = Object.entries(monthlyTrendMap).map(([month, count]) => ({
      month,
      registrations: count,
    }));

    // 3. Compile region breakdown using team_members joined with teams
    const { data: teamMembers, error: membersError } = await (supabase
      .from("team_members") as any)
      .select(`
        user_id,
        teams (
          region
        )
      `);

    if (membersError) throw membersError;

    const regionMap: Record<string, number> = {};
    if (teamMembers) {
      for (const tm of teamMembers) {
        const reg = (tm as any).teams?.region || "Global / Unknown";
        const normalizedReg = reg.toUpperCase();
        regionMap[normalizedReg] = (regionMap[normalizedReg] || 0) + 1;
      }
    }

    const regionBreakdown = Object.entries(regionMap).map(([region, count]) => ({
      region,
      users: count,
    }));

    // 4. Fetch all team members to count total teams registered
    const { count: totalTeams, error: teamsCountError } = await (supabase
      .from("teams") as any)
      .select("*", { count: "exact", head: true });

    // 5. Fetch staff listed in owner_team_members
    const { data: staffList, error: staffError } = await (supabase
      .from("owner_team_members") as any)
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          role
        )
      `)
      .order("added_at", { ascending: false });

    if (staffError) throw staffError;

    return NextResponse.json({
      totalRegistrations: totalRegistrations || 0,
      totalTeams: totalTeams || 0,
      registrationTrend,
      regionBreakdown,
      staffList,
    });
  } catch (err: any) {
    console.error("GET owner stats error:", err);
    return NextResponse.json({ error: err.message || "Failed to load owner analytics stats" }, { status: 500 });
  }
}
