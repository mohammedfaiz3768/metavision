import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("GET /api/profile/me error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, age, in_game_name, bio, social_links, show_team_on_profile } = body;

    // Validate age if provided
    if (age !== undefined && (age < 10 || age > 60)) {
      return NextResponse.json({ error: "Age must be between 10 and 60" }, { status: 400 });
    }

    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (age !== undefined) updates.age = age;
    if (in_game_name !== undefined) updates.in_game_name = in_game_name;
    if (bio !== undefined) updates.bio = bio;
    if (social_links !== undefined) updates.social_links = social_links;
    if (show_team_on_profile !== undefined) updates.show_team_on_profile = show_team_on_profile;
    
    // Always mark setup complete when user updates via profile form
    updates.profile_complete = true;

    const { data: profile, error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("PUT /api/profile/me error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
