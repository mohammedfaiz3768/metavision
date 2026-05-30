import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const TournamentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["official", "unofficial"]).optional(),
  prize_pool_type: z.enum(["top3", "top5", "top12"]).optional(),
  start_date: z.string().optional(),
  final_position: z.number().int().min(1).max(12).nullable().optional(),
  prize_received: z.number().min(0).nullable().optional(),
  status: z.enum(["ongoing", "concluded", "eliminated"]).optional(),
  eliminated_stage: z.string().nullable().optional(),
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tournament, error: tournamentError } = await (supabase
      .from("tournaments") as any)
      .select(`
        *,
        tournament_stages (
          *,
          tournament_matches (*)
        )
      `)
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Verify membership
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", tournament.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Sort stages and their matches
    if (tournament.tournament_stages) {
      tournament.tournament_stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
      for (const stage of tournament.tournament_stages) {
        if (stage.tournament_matches) {
          stage.tournament_matches.sort((a: any, b: any) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        }
      }
    }

    return NextResponse.json(tournament);
  } catch (err: any) {
    console.error("GET tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch tournament" }, { status: 500 });
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

    const body = await request.json();
    const parsed = TournamentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify tournament exists and user has access
    const { data: existing, error: existError } = await (supabase
      .from("tournaments") as any)
      .select("team_id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", existing.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Perform database updates
    const { data: updated, error: updateError } = await (supabase
      .from("tournaments") as any)
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to update tournament" }, { status: 500 });
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

    const { data: existing, error: existError } = await (supabase
      .from("tournaments") as any)
      .select("team_id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", existing.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error: deleteError } = await (supabase
      .from("tournaments") as any)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete tournament" }, { status: 500 });
  }
}
