import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RivalCreateSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1).max(100),
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

    // Fetch non-deleted rival profiles
    const { data: rivals, error: rivalsError } = await (supabase
      .from("rival_profiles") as any)
      .select("*")
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .order("threat_level", { ascending: false })
      .order("name", { ascending: true });

    if (rivalsError) throw rivalsError;

    return NextResponse.json(rivals);
  } catch (err: any) {
    console.error("GET rivals error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch rivals" }, { status: 500 });
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
    const parsed = RivalCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { team_id, name, tag, region, preferred_maps, landing_spots, playstyle_notes, threat_level } = parsed.data;

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

    const { data: rival, error: insertError } = await (supabase
      .from("rival_profiles") as any)
      .insert({
        team_id,
        name,
        tag: tag || null,
        region: region || null,
        preferred_maps: preferred_maps || [],
        landing_spots: landing_spots || [],
        playstyle_notes: playstyle_notes || null,
        threat_level: threat_level || "medium",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: `Rival "${name}" already exists for this team` },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json(rival, { status: 201 });
  } catch (err: any) {
    console.error("POST rival error:", err);
    return NextResponse.json({ error: err.message || "Failed to create rival" }, { status: 500 });
  }
}
