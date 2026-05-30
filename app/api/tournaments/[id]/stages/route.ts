import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const StageCreateSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  stage_order: z.number().int().nonnegative().default(0),
  total_matches: z.number().int().positive().default(6),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = StageCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, stage_order, total_matches } = parsed.data;

    // Verify tournament exists and user has access
    const { data: tournament, error: tourError } = await (supabase
      .from("tournaments") as any)
      .select("team_id")
      .eq("id", tournamentId)
      .single();

    if (tourError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", tournament.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Insert stage
    const { data: stage, error: stageError } = await (supabase
      .from("tournament_stages") as any)
      .insert({
        tournament_id: tournamentId,
        name,
        stage_order,
        total_matches,
      })
      .select("*")
      .single();

    if (stageError || !stage) {
      throw stageError || new Error("Failed to create tournament stage");
    }

    return NextResponse.json(stage, { status: 201 });
  } catch (err: any) {
    console.error("POST tournament stage error:", err);
    return NextResponse.json({ error: err.message || "Failed to create stage" }, { status: 500 });
  }
}
