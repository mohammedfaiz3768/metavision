import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const supabase = (await createClient()) as any;
    const { videoId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: annotations, error } = await supabase
      .from("video_annotations")
      .select("*, profiles(username, in_game_name)")
      .eq("video_id", videoId)
      .order("timestamp_seconds", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(annotations);
  } catch (err: any) {
    console.error("GET /api/videos/[videoId]/annotations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const supabase = (await createClient()) as any;
    const { videoId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { timestamp_seconds, canvas_data, note } = body;

    if (timestamp_seconds === undefined || !canvas_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert annotation
    const { data: annotation, error } = await supabase
      .from("video_annotations")
      .insert({
        video_id: videoId,
        created_by: user.id,
        timestamp_seconds,
        canvas_data,
        note: note || null,
      })
      .select("*, profiles(username, in_game_name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(annotation);
  } catch (err: any) {
    console.error("POST /api/videos/[videoId]/annotations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
