import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's team_id if any
    const { data: memberData } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const teamId = memberData?.team_id;

    // Fetch match videos: team matches or personal matches
    let query = supabase.from("match_videos").select("*, profiles(username, in_game_name)");
    
    if (teamId) {
      // User is in a team: show videos for this team OR personal uploads
      query = query.or(`team_id.eq.${teamId},and(team_id.is.null,uploaded_by.eq.${user.id})`);
    } else {
      // Solo user: show only personal uploads
      query = query.is("team_id", null).eq("uploaded_by", user.id);
    }

    const { data: videos, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(videos);
  } catch (err: any) {
    console.error("GET /api/videos error:", err);
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
    const { title, video_url, duration_seconds, team_id } = body;

    if (!title || !video_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If a team_id is provided, verify user is a member and coach/analyst/IGL
    if (team_id) {
      const { data: memberRole } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .single();

      if (!memberRole || !["coach", "analyst", "IGL"].includes(memberRole.role)) {
        return NextResponse.json(
          { error: "Forbidden: Only Coaches, Analysts, and IGLs can upload team videos" },
          { status: 403 }
        );
      }
    }

    const { data: video, error } = await supabase
      .from("match_videos")
      .insert({
        title,
        video_url,
        duration_seconds: duration_seconds || 0,
        team_id: team_id || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(video);
  } catch (err: any) {
    console.error("POST /api/videos error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
