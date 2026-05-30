import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const MatchCreateSchema = z.object({
  team_id: z.string().uuid(),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
  placement: z.number().int().min(1).max(48),
  total_kills: z.number().int().min(0),
  screenshot_url: z.string().url().nullable().optional(),
  players: z.array(
    z.object({
      player_name: z.string().min(1),
      kills: z.number().int().min(0),
      damage: z.number().int().min(0),
      survived: z.boolean(),
    })
  ).length(4), // enforce 4-player Free Fire roster
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json({ error: "team_id parameter is required" }, { status: 400 });
    }

    // Verify user is in the team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied or not a member of this team" }, { status: 403 });
    }

    // Fetch matches that are not soft-deleted
    const { data: matches, error: matchesError } = await (supabase
      .from("matches") as any)
      .select("*")
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .order("played_at", { ascending: false });

    if (matchesError) {
      throw matchesError;
    }

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("GET matches error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch matches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = MatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { team_id, map, placement, total_kills, screenshot_url, players } = parsed.data;

    // Verify user is a member of the team
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied. Must belong to the team to insert matches." }, { status: 403 });
    }

    // Step 1: Insert Match row
    const { data: match, error: matchError } = await (supabase
      .from("matches") as any)
      .insert({
        team_id,
        map,
        placement,
        total_kills,
        screenshot_url: screenshot_url || null,
        ocr_data: { players }, // Save raw OCR/verification uploader metadata
      })
      .select("*")
      .single();

    if (matchError || !match) {
      throw matchError || new Error("Failed to insert match record");
    }

    // Step 2: Insert related players in bulk
    const playersToInsert = players.map((p) => ({
      match_id: match.id,
      player_name: p.player_name,
      kills: p.kills,
      damage: p.damage,
      survived: p.survived,
    }));

    const { error: playersError } = await (supabase
      .from("match_players") as any)
      .insert(playersToInsert);

    if (playersError) {
      // Clean up the inserted match if players insert fails (manual rollback mock)
      await (supabase.from("matches") as any).delete().eq("id", match.id);
      throw playersError;
    }

    return NextResponse.json(match, { status: 201 });
  } catch (err: any) {
    console.error("POST match error:", err);
    return NextResponse.json({ error: err.message || "Failed to create match record" }, { status: 500 });
  }
}
