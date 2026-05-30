import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculateTotalPoints } from "@/lib/points";

const RoundAddSchema = z.object({
  round_number: z.number().int().min(1).max(6),
  placement: z.number().int().min(1).max(12),
  kills: z.number().int().min(0),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RoundAddSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify session exists
    const { data: session, error: sessionError } = await (supabase
      .from("scrim_sessions") as any)
      .select("team_id, total_rounds")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Scrim session not found" }, { status: 404 });
    }

    // Verify membership
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", session.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { round_number, placement, kills, map } = parsed.data;

    // Check rounds constraint at API level
    if (round_number > session.total_rounds) {
      return NextResponse.json(
        { error: `This session only allows a maximum of ${session.total_rounds} rounds.` },
        { status: 400 }
      );
    }

    // Calculate points using the shared points utility function
    const { placementPoints, killPoints, totalPoints } = calculateTotalPoints(placement, kills);

    // Insert round row
    const { data: insertedRound, error: roundError } = await (supabase
      .from("scrim_rounds") as any)
      .insert({
        session_id: sessionId,
        round_number,
        placement,
        kills,
        map,
        placement_points: placementPoints,
        kill_points: killPoints,
        total_round_points: totalPoints,
      })
      .select("*")
      .single();

    if (roundError || !insertedRound) {
      if (roundError?.code === "23505") {
        return NextResponse.json(
          { error: `Round ${round_number} already exists in this session` },
          { status: 409 }
        );
      }
      throw roundError || new Error("Failed to insert round");
    }

    // Recalculate total scrim points in the session
    const { data: allRounds } = await (supabase
      .from("scrim_rounds") as any)
      .select("total_round_points")
      .eq("session_id", sessionId);

    const sumPoints = (allRounds || []).reduce((acc: number, r: any) => acc + r.total_round_points, 0);

    // Update parent session with total points
    await (supabase
      .from("scrim_sessions") as any)
      .update({ total_scrim_points: sumPoints })
      .eq("id", sessionId);

    return NextResponse.json(insertedRound, { status: 201 });
  } catch (err: any) {
    console.error("POST round error:", err);
    return NextResponse.json({ error: err.message || "Failed to add round" }, { status: 500 });
  }
}
