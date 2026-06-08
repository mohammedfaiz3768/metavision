import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const putSchema = z.object({
  callout_text: z.string().max(100, "Callout text is too long"),
  team_id: z.string().uuid("Invalid team ID"),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ mapId: string; buildingId: string }> }
) {
  try {
    const { mapId, buildingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = putSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { callout_text, team_id } = parsed.data;

    // Check membership and role on the team
    const { data: membership, error: memError } = await (supabase
      .from("team_members") as any)
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    // Role check: Only coach, analyst, and IGL can edit
    const allowedRoles = ["coach", "analyst", "IGL"];
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Coach, Analyst, or IGL roles can edit callouts" },
        { status: 403 }
      );
    }

    // Upsert the callout text
    const { data: callout, error: upsertError } = await (supabase
      .from("building_callouts") as any)
      .upsert(
        {
          team_id,
          map_id: mapId,
          building_id: buildingId,
          callout_text,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "team_id,map_id,building_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json(callout);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
