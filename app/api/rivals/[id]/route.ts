import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RivalUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tag: z.string().max(20).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  preferred_maps: z.array(z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"])).optional(),
  landing_spots: z.array(z.object({
    map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
    poi: z.string().min(1),
    confidence: z.number().min(0).max(1),
  })).optional(),
  playstyle_notes: z.string().max(2000).nullable().optional(),
  threat_level: z.enum(["low", "medium", "high", "elite"]).optional(),
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

    // Fetch rival with scrim history
    const { data: rival, error: rivalError } = await (supabase
      .from("rival_profiles") as any)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (rivalError || !rival) {
      return NextResponse.json({ error: "Rival not found" }, { status: 404 });
    }

    // Verify team membership
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", rival.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch scrim sessions against this rival
    const { data: sessions, error: sessionsError } = await (supabase
      .from("scrim_sessions") as any)
      .select("*, scrim_rounds(*)")
      .eq("rival_id", id)
      .is("deleted_at", null)
      .order("session_date", { ascending: false });

    if (sessionsError) throw sessionsError;

    return NextResponse.json({ ...rival, scrim_sessions: sessions || [] });
  } catch (err: any) {
    console.error("GET rival error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch rival" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = RivalUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify rival exists and user has access
    const { data: existing, error: existError } = await (supabase
      .from("rival_profiles") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Rival not found" }, { status: 404 });
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

    const { data: updated, error: updateError } = await (supabase
      .from("rival_profiles") as any)
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH rival error:", err);
    return NextResponse.json({ error: err.message || "Failed to update rival" }, { status: 500 });
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

    // Verify rival exists
    const { data: existing, error: existError } = await (supabase
      .from("rival_profiles") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (existError || !existing) {
      return NextResponse.json({ error: "Rival not found" }, { status: 404 });
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

    // Soft delete
    const { error: deleteError } = await (supabase
      .from("rival_profiles") as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE rival error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete rival" }, { status: 500 });
  }
}
