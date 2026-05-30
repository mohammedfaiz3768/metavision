import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UploadLogoSchema = z.object({
  analysis_tournament_id: z.string().uuid(),
  team_name: z.string().min(1, "Team name is required"),
  logo_url: z.string().min(1, "Logo data is required"),
  slot_number: z.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournament_id");

    if (!tournamentId) {
      return NextResponse.json({ error: "tournament_id parameter is required" }, { status: 400 });
    }

    const { data: logos, error: logosError } = await (supabase
      .from("team_logo_uploads") as any)
      .select("*")
      .eq("analysis_tournament_id", tournamentId)
      .order("slot_number", { ascending: true });

    if (logosError) throw logosError;

    return NextResponse.json(logos);
  } catch (err: any) {
    console.error("GET tournament logos error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch team logos" }, { status: 500 });
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
    const parsed = UploadLogoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { analysis_tournament_id, team_name, logo_url, slot_number } = parsed.data;

    // Check if slot already exists, if so update it, otherwise insert
    const { data: existing, error: existError } = await (supabase
      .from("team_logo_uploads") as any)
      .select("id")
      .eq("analysis_tournament_id", analysis_tournament_id)
      .eq("slot_number", slot_number)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await (supabase
        .from("team_logo_uploads") as any)
        .update({
          team_name,
          logo_url,
          uploaded_by: user.id,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await (supabase
        .from("team_logo_uploads") as any)
        .insert({
          analysis_tournament_id,
          team_name,
          logo_url,
          slot_number,
          uploaded_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST upload logo error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload team logo" }, { status: 500 });
  }
}
