import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // Fetch match record ensuring it's not soft-deleted
    const { data: match, error: matchError } = await (supabase
      .from("matches") as any)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found or has been deleted" }, { status: 404 });
    }

    // Verify user membership in the match's team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", match.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch related scorecard players
    const { data: players, error: playersError } = await (supabase
      .from("match_players") as any)
      .select("*")
      .eq("match_id", id);

    if (playersError) throw playersError;

    // Fetch related map telemetry events (filtered for soft delete)
    const { data: events, error: eventsError } = await (supabase
      .from("events") as any)
      .select("*")
      .eq("match_id", id)
      .is("deleted_at", null)
      .order("timestamp_ms", { ascending: true });

    if (eventsError) throw eventsError;

    return NextResponse.json({
      ...match,
      players: players || [],
      events: events || [],
    });
  } catch (err: any) {
    console.error("GET single match error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch match details" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Fetch match record to check team ownership
    const { data: match, error: matchError } = await (supabase
      .from("matches") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found or already deleted" }, { status: 404 });
    }

    // Verify user is member of the team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", match.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const nowStr = new Date().toISOString();

    // Enforce soft-delete on match
    const { error: matchDeleteError } = await (supabase
      .from("matches") as any)
      .update({ deleted_at: nowStr })
      .eq("id", id);

    if (matchDeleteError) throw matchDeleteError;

    // Enforce soft-delete on related events
    const { error: eventsDeleteError } = await (supabase
      .from("events") as any)
      .update({ deleted_at: nowStr })
      .eq("match_id", id);

    if (eventsDeleteError) throw eventsDeleteError;

    return NextResponse.json({ success: true, message: "Match and telemetry soft-deleted successfully" });
  } catch (err: any) {
    console.error("DELETE match error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete match" }, { status: 500 });
  }
}
