import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AddStaffSchema = z.object({
  username: z.string().min(1, "Username is required"),
  role: z.enum(["owner", "co_owner", "analyst", "coach"]),
});

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Forbidden — Only Owners & Co-owners can add staff" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = AddStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { username, role } = parsed.data;

    // Find the user by username
    const { data: targetProfile, error: profileError } = await (supabase
      .from("profiles") as any)
      .select("id, role")
      .eq("username", username)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: `User with username "${username}" not found` }, { status: 404 });
    }

    // Check if user is already added
    const { data: existing, error: existError } = await (supabase
      .from("owner_team_members") as any)
      .select("id")
      .eq("user_id", targetProfile.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "User is already a member of the owner team" }, { status: 409 });
    }

    // Insert staff member
    const { data: inserted, error: insertError } = await (supabase
      .from("owner_team_members") as any)
      .insert({
        user_id: targetProfile.id,
        role,
        added_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw insertError || new Error("Failed to add team member");
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: any) {
    console.error("POST owner team error:", err);
    return NextResponse.json({ error: err.message || "Failed to add member to staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
      return NextResponse.json({ error: "Forbidden — Only Owners & Co-owners can remove staff" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    // Prevent deleting oneself
    const { data: targetMember, error: targetError } = await (supabase
      .from("owner_team_members") as any)
      .select("user_id")
      .eq("id", memberId)
      .single();

    if (targetMember && targetMember.user_id === user.id) {
      return NextResponse.json({ error: "You cannot revoke your own executive credentials" }, { status: 400 });
    }

    const { error: deleteError } = await (supabase
      .from("owner_team_members") as any)
      .delete()
      .eq("id", memberId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE owner team error:", err);
    return NextResponse.json({ error: err.message || "Failed to remove team member" }, { status: 500 });
  }
}
