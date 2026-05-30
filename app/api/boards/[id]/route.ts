import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canDeleteBoard } from "@/lib/types/app.types";
import { migrateCanvasData } from "@/lib/whiteboard/konva-utils";
import { resolveBoardPermission } from "@/lib/whiteboard/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get the board
    const { data: board, error: boardError } = await (supabase
      .from("strategy_boards") as any)
      .select("*, teams(name, region)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Resolve centralized board-scoped permission hierarchy
    const permission = await resolveBoardPermission(user?.id || null, id);
    if (!permission) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this board" },
        { status: 403 }
      );
    }

    // Fetch individual board nodes from board_nodes
    const { data: dbNodes, error: nodesError } = await (supabase
      .from("board_nodes") as any)
      .select("*")
      .eq("board_id", id)
      .is("deleted_at", null);

    if (nodesError) {
      return NextResponse.json({ error: nodesError.message }, { status: 500 });
    }

    // Reconstruct canvas_data.nodes array dynamically from DB rows
    const reconstructedNodes = (dbNodes || []).map((dbNode: any) => ({
      id: dbNode.id,
      type: dbNode.type,
      layer: dbNode.layer,
      x: dbNode.x,
      y: dbNode.y,
      min_x: dbNode.min_x,
      min_y: dbNode.min_y,
      max_x: dbNode.max_x,
      max_y: dbNode.max_y,
      lockedBy: dbNode.locked_by,
      lockExpiresAt: dbNode.lock_expires_at,
      createdBy: dbNode.created_by || "",
      updatedBy: dbNode.created_by || "",
      version: dbNode.version,
      updatedAt: new Date(dbNode.updated_at).getTime(),
      ...dbNode.node_json,
    }));

    board.canvas_data = {
      schemaVersion: 1,
      nodes: reconstructedNodes,
    };

    return NextResponse.json(board);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { CanvasNodeSchema, calculateAuthoritativeBounds } from "@/lib/whiteboard/validation";

export async function PUT(
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

    // Resolve centralized board-scoped permission hierarchy
    const permission = await resolveBoardPermission(user.id, id);
    if (permission !== "admin" && permission !== "editor") {
      return NextResponse.json(
        { error: "Forbidden: You do not have edit rights on this board" },
        { status: 403 }
      );
    }

    // Get board to verify team ownership (used to return detailed single-row update)
    const { data: board, error: boardError } = await (supabase
      .from("strategy_boards") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const body = await request.json();
    const { canvas_data, title, thumbnail_url } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updates.title = title;
    }
    if (thumbnail_url !== undefined) {
      updates.thumbnail_url = thumbnail_url;
    }

    // 1. If canvas_data is provided, perform validation and persist row-by-row
    if (canvas_data !== undefined && canvas_data.nodes !== undefined) {
      const incomingNodes = canvas_data.nodes;

      // Validate every node using Zod Union Schemas
      for (const node of incomingNodes) {
        const parsed = CanvasNodeSchema.safeParse(node);
        if (!parsed.success) {
          return NextResponse.json(
            { error: `Validation failed: ${parsed.error.message}` },
            { status: 400 }
          );
        }
      }

      const activeIds = incomingNodes.map((n: any) => n.id);

      // Perform a soft-delete for any nodes that are currently active in DB but missing from incoming document
      if (activeIds.length > 0) {
        await (supabase
          .from("board_nodes") as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq("board_id", id)
          .not("id", "in", `(${activeIds.join(",")})`);
      } else {
        await (supabase
          .from("board_nodes") as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq("board_id", id);
      }

      // Bulk upsert new and updated nodes
      const upsertRows = incomingNodes.map((node: any) => {
        // Authoritatively compute bounding coordinates server-side
        const bounds = calculateAuthoritativeBounds(node);

        const { id: nid, type, layer, x, y, version, createdBy } = node;

        const node_json = { ...node };
        delete node_json.id;
        delete node_json.type;
        delete node_json.layer;
        delete node_json.x;
        delete node_json.y;
        delete node_json.version;
        delete node_json.createdBy;
        delete node_json.min_x;
        delete node_json.min_y;
        delete node_json.max_x;
        delete node_json.max_y;
        delete node_json.lockedBy;
        delete node_json.lockExpiresAt;

        return {
          id: nid,
          board_id: id,
          type,
          layer,
          x,
          y,
          node_json,
          version: version || 1,
          min_x: bounds.min_x,
          min_y: bounds.min_y,
          max_x: bounds.max_x,
          max_y: bounds.max_y,
          created_by: createdBy || user.id,
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
      });

      if (upsertRows.length > 0) {
        const { error: upsertError } = await (supabase
          .from("board_nodes") as any)
          .upsert(upsertRows);

        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }
      }

      // Re-compile clean schema updates
      updates.canvas_data = {
        schemaVersion: 1,
        nodes: incomingNodes,
      };
    }

    // Update board details
    const { data: updatedBoard, error: updateError } = await (supabase
      .from("strategy_boards") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedBoard);
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

    // Fetch board to check ownership and role
    const { data: board, error: boardError } = await (supabase
      .from("strategy_boards") as any)
      .select("team_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get user's role on the team
    const { data: membership, error: memError } = await (supabase
      .from("team_members") as any)
      .select("role")
      .eq("team_id", board.team_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only coach/IGL/analyst can delete boards
    if (!canDeleteBoard(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: only Coach, Analyst, or IGL can delete boards" },
        { status: 403 }
      );
    }

    // Soft delete the board
    const { error: deleteError } = await (supabase
      .from("strategy_boards") as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
