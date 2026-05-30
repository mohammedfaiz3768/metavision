import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateTotalPoints } from "@/lib/points";
import { z } from "zod";

const MatchCreateSchema = z.object({
  match_name: z.string().min(1, "Match name is required"),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
  placement: z.number().int().min(1).max(12),
  kills: z.number().int().nonnegative().default(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id: tournamentId, stageId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = MatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { match_name, map, placement, kills } = parsed.data;

    // Verify stage belongs to tournament and tournament belongs to user's team
    const { data: stage, error: stageError } = await (supabase
      .from("tournament_stages") as any)
      .select("*, tournaments(team_id)")
      .eq("id", stageId)
      .eq("tournament_id", tournamentId)
      .single();

    if (stageError || !stage) {
      return NextResponse.json({ error: "Stage not found in this tournament" }, { status: 404 });
    }

    const teamId = (stage as any).tournaments.team_id;

    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if stage already has maximum allowed matches
    const { count: matchCount, error: countError } = await (supabase
      .from("tournament_matches") as any)
      .select("id", { count: "exact", head: true })
      .eq("stage_id", stageId);

    if (countError) {
      throw countError;
    }

    const currentMatches = matchCount || 0;
    const maxMatches = (stage as any).total_matches ?? 6;

    if (currentMatches >= maxMatches) {
      return NextResponse.json(
        { error: `This stage has reached its maximum limit of ${maxMatches} matches.` },
        { status: 400 }
      );
    }

    // Calculate points using shared points math
    const { placementPoints, killPoints, totalPoints } = calculateTotalPoints(placement, kills);

    // Insert match
    const { data: match, error: matchError } = await (supabase
      .from("tournament_matches") as any)
      .insert({
        stage_id: stageId,
        match_name,
        map,
        placement,
        kills,
        placement_points: placementPoints,
        kill_points: killPoints,
        total_match_points: totalPoints,
      })
      .select("*")
      .single();

    if (matchError || !match) {
      throw matchError || new Error("Failed to create tournament match");
    }

    return NextResponse.json(match, { status: 201 });
  } catch (err: any) {
    console.error("POST tournament match error:", err);
    return NextResponse.json({ error: err.message || "Failed to create match" }, { status: 500 });
  }
}
