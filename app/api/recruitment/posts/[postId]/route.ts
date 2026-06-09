import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    const { data: post, error } = await supabase
      .from("recruitment_posts")
      .select("*, profiles(username, avatar_url, in_game_name), teams(name, logo_url)")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (err: any) {
    console.error("GET /api/recruitment/posts/[postId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();
    const { title, description, roles, status } = body;

    // Fetch existing post to check ownership
    const { data: existingPost } = await supabase
      .from("recruitment_posts")
      .select("posted_by")
      .eq("id", postId)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.posted_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (roles !== undefined) updates.roles = Array.isArray(roles) ? roles : [roles];
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { data: post, error } = await supabase
      .from("recruitment_posts")
      .update(updates)
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(post);
  } catch (err: any) {
    console.error("PUT /api/recruitment/posts/[postId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
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

    // Fetch existing post to check ownership
    const { data: existingPost } = await supabase
      .from("recruitment_posts")
      .select("posted_by")
      .eq("id", postId)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.posted_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("recruitment_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/recruitment/posts/[postId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
