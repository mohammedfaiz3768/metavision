import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's team membership from search params or select the first team
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");

    let memQuery = (supabase.from("team_members") as any)
      .select("team_id, role")
      .eq("user_id", user.id);

    if (teamId) {
      memQuery = memQuery.eq("team_id", teamId);
    }

    const { data: memberships, error: memError } = await memQuery;

    if (memError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No team membership found" },
        { status: 400 }
      );
    }

    const activeTeamId = memberships[0].team_id;
    const userRole = memberships[0].role;

    // Fetch callouts
    const { data: callouts, error: calloutsError } = await (supabase
      .from("building_callouts") as any)
      .select("*")
      .eq("team_id", activeTeamId)
      .eq("map_id", mapId);

    if (calloutsError) {
      return NextResponse.json({ error: calloutsError.message }, { status: 500 });
    }

    return NextResponse.json({
      callouts: callouts || [],
      userRole,
      teamId: activeTeamId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
