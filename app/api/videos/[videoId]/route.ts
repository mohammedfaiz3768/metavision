import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const supabase = await createClient();
    const { videoId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: video, error } = await supabase
      .from("match_videos")
      .select("*, profiles(username, in_game_name)")
      .eq("id", videoId)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (err: any) {
    console.error("GET /api/videos/[videoId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
