import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get board to verify team membership
    const { data: board, error: boardError } = await (supabase
      .from("strategy_boards") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check team membership
    const { data: membership, error: memError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", board.team_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !membership) {
      return NextResponse.json(
        { error: "Unauthorized to share this board" },
        { status: 403 }
      );
    }

    // Generate token and share board
    const publicToken = uuidv4();
    const { data: updatedBoard, error: updateError } = await (supabase
      .from("strategy_boards") as any)
      .update({
        is_public: true,
        public_token: publicToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicToken,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${publicToken}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get board
    const { data: board, error: boardError } = await (supabase
      .from("strategy_boards") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check team membership
    const { data: membership, error: memError } = await (supabase
      .from("team_members") as any)
      .select("id")
      .eq("team_id", board.team_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !membership) {
      return NextResponse.json(
        { error: "Unauthorized to revoke share for this board" },
        { status: 403 }
      );
    }

    // Revoke sharing
    const { data: updatedBoard, error: updateError } = await (supabase
      .from("strategy_boards") as any)
      .update({
        is_public: false,
        public_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
