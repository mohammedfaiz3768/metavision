import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const EventBatchSchema = z.object({
  events: z.array(
    z.object({
      client_event_id: z.string().uuid(),
      type: z.enum(["knock", "death", "fight", "rotation", "revive", "utility", "vehicle"]),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      player_name: z.string().nullable().optional(),
      timestamp_ms: z.number().int().min(0).nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).default({}),
      schema_version: z.number().int().default(1),
    })
  ),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify match exists and is not soft deleted
    const { data: match, error: matchError } = await (supabase
      .from("matches") as any)
      .select("team_id")
      .eq("id", matchId)
      .is("deleted_at", null)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Verify user membership in team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", match.team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = EventBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { events } = parsed.data;

    if (events.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No events to batch insert" });
    }

    // Map to db events representation
    const eventsToInsert = events.map((e) => ({
      client_event_id: e.client_event_id,
      match_id: matchId,
      type: e.type,
      x: e.x,
      y: e.y,
      player_name: e.player_name || null,
      timestamp_ms: e.timestamp_ms || null,
      metadata: e.metadata,
      schema_version: e.schema_version,
    }));

    // Idempotent bulk upsert: ignore inserts on conflict with client_event_id
    const { data, error: upsertError } = await (supabase
      .from("events") as any)
      .upsert(eventsToInsert, { onConflict: "client_event_id" });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      count: eventsToInsert.length,
      message: `Idempotently saved ${eventsToInsert.length} telemetry events`,
    });
  } catch (err: any) {
    console.error("Batch save events error:", err);
    return NextResponse.json({ error: err.message || "Failed to batch save events" }, { status: 500 });
  }
}
