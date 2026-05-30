import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScrimCreateSchema = z.object({
  team_id: z.string().uuid(),
  session_date: z.string(), // YYYY-MM-DD
  time_slot: z.enum(["12pm", "3pm", "6pm", "9pm", "12am"]),
  total_rounds: z.number().int().refine((val) => val === 3 || val === 6, {
    message: "Rounds per scrim must be either 3 or 6",
  }),
  entry_fee: z.number().min(0),
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

    // Fetch sessions with rounds
    const { data: sessions, error: sessionsError } = await (supabase
      .from("scrim_sessions") as any)
      .select("*, scrim_rounds(*)")
      .eq("team_id", teamId)
      .order("session_date", { ascending: false });

    if (sessionsError) throw sessionsError;

    return NextResponse.json(sessions);
  } catch (err: any) {
    console.error("GET scrims error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch scrims" }, { status: 500 });
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
    const parsed = ScrimCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { team_id, session_date, time_slot, total_rounds, entry_fee } = parsed.data;

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

    // Insert session (default total points = 0 initially)
    const { data: session, error: sessionError } = await (supabase
      .from("scrim_sessions") as any)
      .insert({
        team_id,
        session_date,
        time_slot,
        total_rounds,
        entry_fee,
        total_scrim_points: 0,
      })
      .select("*")
      .single();

    if (sessionError || !session) {
      throw sessionError || new Error("Failed to create scrim session");
    }

    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    console.error("POST scrim error:", err);
    return NextResponse.json({ error: err.message || "Failed to create scrim session" }, { status: 500 });
  }
}
