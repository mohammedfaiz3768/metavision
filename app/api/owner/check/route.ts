import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isOwner: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await (supabase
      .from("owner_team_members") as any)
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ isOwner: false });
    }

    return NextResponse.json({
      isOwner: true,
      role: membership.role,
      membership,
    });
  } catch (err: any) {
    console.error("GET owner check error:", err);
    return NextResponse.json({ isOwner: false, error: err.message }, { status: 500 });
  }
}
