import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AnalysisMatchCreateSchema = z.object({
  match_name: z.string().min(1, "Match name is required"),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
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

    // Verify owner authorization
    const { data: membership, error: membershipError } = await (supabase
      .from("owner_team_members") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden — Owner Access Only" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = AnalysisMatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { match_name, map } = parsed.data;

    // Verify stage belongs to tournament
    const { data: stage, error: stageError } = await (supabase
      .from("analysis_stages") as any)
      .select("id")
      .eq("id", stageId)
      .eq("tournament_id", tournamentId)
      .single();

    if (stageError || !stage) {
      return NextResponse.json({ error: "Analysis stage not found in this tournament" }, { status: 404 });
    }

    // Insert analysis match (default empty canvas and list of logos)
    const { data: match, error: matchError } = await (supabase
      .from("analysis_matches") as any)
      .insert({
        stage_id: stageId,
        match_name,
        map,
        canvas_data: { schemaVersion: 1, nodes: [] },
        team_logos: [],
      })
      .select("*")
      .single();

    if (matchError || !match) {
      throw matchError || new Error("Failed to create analysis match");
    }

    return NextResponse.json(match, { status: 201 });
  } catch (err: any) {
    console.error("POST analysis match error:", err);
    return NextResponse.json({ error: err.message || "Failed to create match" }, { status: 500 });
  }
}
