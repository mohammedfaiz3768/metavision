import { createClient } from "@/lib/supabase/server";

export type BoardPermission = "viewer" | "commenter" | "editor" | "admin";

/**
 * Centralized authorization engine.
 * Computes a user's exact permission for a board, taking into account
 * public status, team memberships, team owner status, profiles role, and board-scoped permissions.
 */
export async function resolveBoardPermission(
  userId: string | null,
  boardId: string
): Promise<BoardPermission | null> {
  const supabase = await createClient();

  // 1. Fetch Board and associated Team Owner
  const { data: board, error: boardError } = await (supabase
    .from("strategy_boards") as any)
    .select("*, teams(owner_id)")
    .eq("id", boardId)
    .is("deleted_at", null)
    .single();

  if (boardError || !board) return null;

  // Read-only access check for public boards when unauthenticated
  if (board.is_public && !userId) {
    return "viewer";
  }

  if (!userId) return null;

  // 2. Fetch User Profile to check platform-level admin role
  const { data: profile } = await (supabase
    .from("profiles") as any)
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    return "admin";
  }

  // 3. Creator or Team Owner gets Admin
  if (board.created_by === userId || board.teams?.owner_id === userId) {
    return "admin";
  }

  // 4. Fetch explicit board-scoped permissions
  const { data: boardPerm } = await (supabase
    .from("board_permissions") as any)
    .select("permission")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .single();

  if (boardPerm) {
    return boardPerm.permission as BoardPermission;
  }

  // 5. Fetch team membership role to resolve default inherited rights
  const { data: membership } = await (supabase
    .from("team_members") as any)
    .select("role")
    .eq("team_id", board.team_id)
    .eq("user_id", userId)
    .single();

  if (membership) {
    const role = membership.role;
    // Inherit editor roles for Coaches, Analysts, and IGLs
    if (role === "coach" || role === "analyst" || role === "IGL") {
      return "editor";
    }
    // Standard players get editor permission by default for dynamic co-drafting
    return "editor";
  }

  // 6. Public board fallback for authenticated external guests
  if (board.is_public) {
    return "viewer";
  }

  return null;
}
