import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const postType = searchParams.get("post_type"); // 'player_seeking_team' or 'team_seeking_player'
    const status = searchParams.get("status") || "open"; // 'open' or 'closed'

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("recruitment_posts")
      .select("*, profiles(username, avatar_url, in_game_name), teams(name, logo_url)");

    if (postType) {
      query = query.eq("post_type", postType);
    }
    
    if (status) {
      query = query.eq("status", status);
    }

    const { data: posts, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(posts);
  } catch (err: any) {
    console.error("GET /api/recruitment/posts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { post_type, title, description, roles, team_id } = body;

    if (!post_type || !title || !description || !roles) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert post
    const { data: post, error } = await supabase
      .from("recruitment_posts")
      .insert({
        posted_by: user.id,
        team_id: team_id || null,
        post_type,
        title,
        description,
        roles: Array.isArray(roles) ? roles : [roles],
        status: "open",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(post);
  } catch (err: any) {
    console.error("POST /api/recruitment/posts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
