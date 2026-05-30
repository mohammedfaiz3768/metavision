import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    let query = (supabase.from("profiles") as any)
      .select("*, team_members(teams(name, region))")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("username", `%${search}%`);
    }

    if (role) {
      query = query.eq("role", role);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) throw usersError;

    return NextResponse.json(users);
  } catch (err: any) {
    console.error("GET owner users error:", err);
    return NextResponse.json({ error: err.message || "Failed to load platform users" }, { status: 500 });
  }
}

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["player", "coach", "analyst", "admin", "owner", "co_owner"]),
});

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify requesting user is owner or co_owner in owner_team_members
    const { data: membership, error: membershipError } = await (supabase
      .from("owner_team_members") as any)
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["owner", "co_owner"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden — Only Owners & Co-owners can update user roles" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    // Prevent updating oneself
    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot change your own profile role directly" }, { status: 400 });
    }

    const { data: updatedProfile, error: updateError } = await (supabase
      .from("profiles") as any)
      .update({ role })
      .eq("id", userId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedProfile);
  } catch (err: any) {
    console.error("PUT owner user error:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile role" }, { status: 500 });
  }
}
