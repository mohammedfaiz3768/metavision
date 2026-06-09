import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ videoId: string; annotationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { videoId, annotationId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("video_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("video_id", videoId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/videos/[videoId]/annotations/[annotationId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
