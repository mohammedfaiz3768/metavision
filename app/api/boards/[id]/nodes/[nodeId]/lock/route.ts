import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBoardPermission } from "@/lib/whiteboard/permissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id: boardId, nodeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve centralized permissions
    const permission = await resolveBoardPermission(user.id, boardId);
    if (permission !== "admin" && permission !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch active lock on the node
    const { data: node, error: fetchError } = await (supabase
      .from("board_nodes") as any)
      .select("locked_by, lock_expires_at")
      .eq("id", nodeId)
      .single();

    if (fetchError || !node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const now = new Date();
    const hasActiveLock = node.locked_by !== null && node.lock_expires_at && new Date(node.lock_expires_at) > now;

    if (hasActiveLock && node.locked_by !== user.id) {
      return NextResponse.json(
        { error: "Node is locked by another teammate" },
        { status: 409 }
      );
    }

    // Acquire lock for 5 seconds
    const lockExpiresAt = new Date(Date.now() + 5000).toISOString();
    const { error: lockError } = await (supabase
      .from("board_nodes") as any)
      .update({
        locked_by: user.id,
        lock_expires_at: lockExpiresAt,
      })
      .eq("id", nodeId);

    if (lockError) {
      return NextResponse.json({ error: lockError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lockExpiresAt });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id: boardId, nodeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Release only if locked by current user
    const { error: unlockError } = await (supabase
      .from("board_nodes") as any)
      .update({
        locked_by: null,
        lock_expires_at: null,
      })
      .eq("id", nodeId)
      .eq("locked_by", user.id);

    if (unlockError) {
      return NextResponse.json({ error: unlockError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
