import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AnalysisTournamentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  is_published: z.boolean().optional(),
  thumbnail_url: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: tournament, error } = await (supabase
      .from("analysis_tournaments") as any)
      .select(`
        *,
        analysis_stages (
          *,
          analysis_matches (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error || !tournament) {
      return NextResponse.json({ error: "Analysis tournament not found" }, { status: 404 });
    }

    if (!tournament.is_published && !isStaff) {
      return NextResponse.json({ error: "Access denied — Tournament is not published yet" }, { status: 403 });
    }

    // Filter out unpublished matches for observers
    if (!isStaff && tournament.analysis_stages) {
      for (const stage of tournament.analysis_stages) {
        if (stage.analysis_matches) {
          stage.analysis_matches = stage.analysis_matches.filter((m: any) => m.is_published);
        }
      }
    }

    // Sort stages and their matches
    if (tournament.analysis_stages) {
      tournament.analysis_stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
      for (const stage of tournament.analysis_stages) {
        if (stage.analysis_matches) {
          stage.analysis_matches.sort((a: any, b: any) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        }
      }
    }

    return NextResponse.json(tournament);
  } catch (err: any) {
    console.error("GET analysis tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch tournament details" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const parsed = AnalysisTournamentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Perform database updates
    const { data: updated, error: updateError } = await (supabase
      .from("analysis_tournaments") as any)
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT analysis tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to update tournament details" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      .from("analysis_tournaments") as any)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE analysis tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete tournament" }, { status: 500 });
  }
}
