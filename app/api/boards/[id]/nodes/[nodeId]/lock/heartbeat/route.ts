import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Refresh lock only if currently owned by the caller
    const lockExpiresAt = new Date(Date.now() + 5000).toISOString();
    
    const { data: updatedNode, error: updateError } = await (supabase
      .from("board_nodes") as any)
      .update({
        lock_expires_at: lockExpiresAt,
      })
      .eq("id", nodeId)
      .eq("locked_by", user.id)
      .select();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedNode || updatedNode.length === 0) {
      return NextResponse.json(
        { error: "Conflict: Lock has expired or been claimed by someone else" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, lockExpiresAt });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
