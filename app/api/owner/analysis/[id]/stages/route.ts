import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AnalysisStageCreateSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  stage_order: z.number().int().nonnegative().default(0),
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
    const parsed = AnalysisStageCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, stage_order } = parsed.data;

    // Insert analysis stage
    const { data: stage, error: stageError } = await (supabase
      .from("analysis_stages") as any)
      .insert({
        tournament_id: tournamentId,
        name,
        stage_order,
      })
      .select("*")
      .single();

    if (stageError || !stage) {
      throw stageError || new Error("Failed to create analysis stage");
    }

    return NextResponse.json(stage, { status: 201 });
  } catch (err: any) {
    console.error("POST analysis stage error:", err);
    return NextResponse.json({ error: err.message || "Failed to create stage" }, { status: 500 });
  }
}
