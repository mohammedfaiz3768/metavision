import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canCreateBoard } from "@/lib/types/app.types";
import { z } from "zod";

const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  map: z.enum(["bermuda", "purgatory", "kalahari", "nexterra", "solara"]),
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

    // Get user's active team membership
    const { searchParams } = new URL(request.url);
    const queryTeamId = searchParams.get("team_id");

    let memQuery = (supabase.from("team_members") as any)
      .select("team_id")
      .eq("user_id", user.id);

    if (queryTeamId) {
      memQuery = memQuery.eq("team_id", queryTeamId);
    }

    const { data: memberships, error: memError } = await memQuery;

    if (memError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No team membership found" },
        { status: 400 }
      );
    }

    const membership = memberships[0];

    // Get boards
    const { data: boards, error: boardsError } = await (supabase
      .from("strategy_boards") as any)
      .select("*")
      .eq("team_id", membership.team_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (boardsError) {
      return NextResponse.json({ error: boardsError.message }, { status: 500 });
    }

    return NextResponse.json(boards);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
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

    // Get user's active team membership and role
    const { searchParams } = new URL(request.url);
    const queryTeamId = searchParams.get("team_id");

    let memQuery = (supabase.from("team_members") as any)
      .select("team_id, role")
      .eq("user_id", user.id);

    if (queryTeamId) {
      memQuery = memQuery.eq("team_id", queryTeamId);
    }

    const { data: memberships, error: memError } = await memQuery;

    if (memError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No team membership found" },
        { status: 400 }
      );
    }

    const membership = memberships[0];

    // Check permissions
    if (!canCreateBoard(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: only Coach, Analyst, or IGL can create boards" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const parsed = createBoardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, map } = parsed.data;

    // Create board
    const { data: board, error: insertError } = await (supabase
      .from("strategy_boards") as any)
      .insert({
        team_id: membership.team_id,
        title,
        map,
        created_by: user.id,
        canvas_data: { schemaVersion: 1, nodes: [] },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(board);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
