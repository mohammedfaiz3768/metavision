import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const TournamentCreateSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1, "Tournament name is required"),
  type: z.enum(["official", "unofficial"]),
  prize_pool_type: z.enum(["top3", "top5", "top12"]),
  start_date: z.string().optional(),
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

    // Verify membership
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch tournaments
    const { data: tournaments, error: tournamentsError } = await (supabase
      .from("tournaments") as any)
      .select("*")
      .eq("team_id", teamId)
      .order("start_date", { ascending: false });

    if (tournamentsError) throw tournamentsError;

    return NextResponse.json(tournaments);
  } catch (err: any) {
    console.error("GET tournaments error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch tournaments" }, { status: 500 });
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
    const parsed = TournamentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { team_id, name, type, prize_pool_type, start_date } = parsed.data;

    // Verify membership
    const { data: member, error: memberError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Insert tournament
    const { data: tournament, error: tournamentError } = await (supabase
      .from("tournaments") as any)
      .insert({
        team_id,
        name,
        type,
        prize_pool_type,
        start_date: start_date || null,
      })
      .select("*")
      .single();

    if (tournamentError || !tournament) {
      throw tournamentError || new Error("Failed to create tournament");
    }

    return NextResponse.json(tournament, { status: 201 });
  } catch (err: any) {
    console.error("POST tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to create tournament" }, { status: 500 });
  }
}
