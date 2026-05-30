import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const StageUpdateSchema = z.object({
  status: z.enum(["ongoing", "qualified", "eliminated"]),
});

export async function PUT(
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
    const parsed = StageUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

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

    // Update stage status
    const { data: updatedStage, error: updateStageError } = await (supabase
      .from("tournament_stages") as any)
      .update({ status })
      .eq("id", stageId)
      .select("*")
      .single();

    if (updateStageError || !updatedStage) {
      throw updateStageError || new Error("Failed to update stage status");
    }

    // If stage status is eliminated, cascade to parent tournament
    if (status === "eliminated") {
      const { error: tournamentError } = await (supabase
        .from("tournaments") as any)
        .update({
          status: "eliminated",
          eliminated_stage: stage.name,
          final_position: null,
          prize_received: 0,
        })
        .eq("id", tournamentId);

      if (tournamentError) {
        console.error("Cascading tournament elimination error:", tournamentError);
        // We won't rollback stage update, but log it
      }
    } else if (status === "qualified") {
      // Revert parent tournament status to ongoing if it was somehow set to eliminated/concluded (optional, but keep it clean)
      const { error: tournamentError } = await (supabase
        .from("tournaments") as any)
        .update({
          status: "ongoing",
          eliminated_stage: null,
        })
        .eq("id", tournamentId);

      if (tournamentError) {
        console.error("Cascading tournament qualification error:", tournamentError);
      }
    }

    return NextResponse.json(updatedStage);
  } catch (err: any) {
    console.error("PUT stage update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update stage" }, { status: 500 });
  }
}
