import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const MatchUpdateSchema = z.object({
  canvas_data: z.any().optional(),
  team_logos: z.any().optional(),
  match_name: z.string().min(1).optional(),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]).optional(),
  is_published: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; stageId: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check staff membership
    let isStaff = false;
    if (user) {
      const { data: member } = await (supabase
        .from("owner_team_members") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (member) isStaff = true;
    }

    const { data: match, error } = await (supabase
      .from("analysis_matches") as any)
      .select(`
        *,
        analysis_stages!inner (
          *,
          analysis_tournaments!inner (
            *
          )
        )
      `)
      .eq("id", matchId)
      .single();

    if (error || !match) {
      return NextResponse.json({ error: "Analysis match not found" }, { status: 404 });
    }

    const isPublished = match.is_published;
    if (!isPublished && !isStaff) {
      return NextResponse.json({ error: "Access denied — Match strategy is not published yet" }, { status: 403 });
    }

    return NextResponse.json(match);
  } catch (err: any) {
    console.error("GET analysis match error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch match details" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
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
    const parsed = MatchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Perform database updates
    const { data: updated, error: updateError } = await (supabase
      .from("analysis_matches") as any)
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT analysis match error:", err);
    return NextResponse.json({ error: err.message || "Failed to update match details" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stageId: string; matchId: string }> }
) {
  try {
    const { matchId } = await params;
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

    const { error: deleteError } = await (supabase
      .from("analysis_matches") as any)
      .delete()
      .eq("id", matchId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE analysis match error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete match" }, { status: 500 });
  }
}
