import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AnalysisTournamentCreateSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  thumbnail_url: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch all analysis tournaments
    // If user is in owner staff, fetch all. Otherwise, fetch only published ones.
    let isStaff = false;
    if (user) {
      const { data: member } = await (supabase
        .from("owner_team_members") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (member) isStaff = true;
    }

    let query = (supabase.from("analysis_tournaments") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!isStaff) {
      query = query.eq("is_published", true);
    }

    const { data: tournaments, error } = await query;

    if (error) throw error;

    return NextResponse.json(tournaments);
  } catch (err: any) {
    console.error("GET analysis tournaments error:", err);
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
    const parsed = AnalysisTournamentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, thumbnail_url } = parsed.data;

    // Insert analysis tournament
    const { data: tournament, error: insertError } = await (supabase
      .from("analysis_tournaments") as any)
      .insert({
        name,
        created_by: user.id,
        is_published: false,
        thumbnail_url: thumbnail_url || null,
      })
      .select("*")
      .single();

    if (insertError || !tournament) {
      throw insertError || new Error("Failed to create analysis tournament");
    }

    return NextResponse.json(tournament, { status: 201 });
  } catch (err: any) {
    console.error("POST analysis tournament error:", err);
    return NextResponse.json({ error: err.message || "Failed to create analysis tournament" }, { status: 500 });
  }
}
