import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScrimUpdateSchema = z.object({
  overall_standing: z.number().int().min(1).max(12).optional(),
  above_team_points: z.number().int().min(0).nullable().optional(),
  below_team_points: z.number().int().min(0).nullable().optional(),
  first_place_points: z.number().int().min(0).nullable().optional(),
  prize_pool_received: z.number().min(0).nullable().optional(),
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

    const { data: session, error: sessionError } = await (supabase
      .from("scrim_sessions") as any)
      .select("*, scrim_rounds(*)")
      .eq("id", id)
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

    // Sort rounds by round_number
    if (session.scrim_rounds) {
      session.scrim_rounds.sort((a: any, b: any) => a.round_number - b.round_number);
    }

    return NextResponse.json(session);
  } catch (err: any) {
    console.error("GET scrim error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch scrim" }, { status: 500 });
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
    const parsed = ScrimUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify session exists and user has access
    const { data: existing, error: existError } = await (supabase
      .from("scrim_sessions") as any)
      .select("team_id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Scrim session not found" }, { status: 404 });
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
      .from("scrim_sessions") as any)
      .update(parsed.data)
      .eq("id", id)
      .select("*, scrim_rounds(*)")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT scrim error:", err);
    return NextResponse.json({ error: err.message || "Failed to update scrim" }, { status: 500 });
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
      .from("scrim_sessions") as any)
      .select("team_id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Scrim session not found" }, { status: 404 });
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

    // Hard delete since the old tables were soft-deleted but now we overhauled it
    const { error: deleteError } = await (supabase
      .from("scrim_sessions") as any)
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE scrim error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete scrim" }, { status: 500 });
  }
}
