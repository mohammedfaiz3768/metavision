import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json({ error: "team_id parameter is required" }, { status: 400 });
    }

    // Verify user membership in the team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch active matches
    const { data: matches, error: matchesError } = await (supabase
      .from("matches") as any)
      .select("*")
      .eq("team_id", teamId)
      .is("deleted_at", null);

    if (matchesError) throw matchesError;

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [], players: [] });
    }

    const matchIds = matches.map((m: any) => m.id);

    // Fetch all related match player metrics
    const { data: players, error: playersError } = await (supabase
      .from("match_players") as any)
      .select("*")
      .in("match_id", matchIds);

    if (playersError) throw playersError;

    return NextResponse.json({
      matches,
      players: players || [],
    });
  } catch (err: any) {
    console.error("GET analytics error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch analytics aggregates" }, { status: 500 });
  }
}
