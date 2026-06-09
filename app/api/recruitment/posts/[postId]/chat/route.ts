import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = (await createClient()) as any;
    const { postId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the post details
    const { data: post, error: postError } = await supabase
      .from("recruitment_posts")
      .select("posted_by")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.posted_by === user.id) {
      return NextResponse.json({ error: "Cannot start a chat with yourself" }, { status: 400 });
    }

    // Check for existing thread
    const { data: existingThread } = await supabase
      .from("recruitment_threads")
      .select("*")
      .eq("post_id", postId)
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (existingThread) {
      return NextResponse.json(existingThread);
    }

    // Create a new thread
    const { data: newThread, error: insertError } = await supabase
      .from("recruitment_threads")
      .insert({
        post_id: postId,
        applicant_id: user.id,
        post_owner_id: post.posted_by,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(newThread);
  } catch (err: any) {
    console.error("POST /api/recruitment/posts/[postId]/chat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
