import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = (await createClient()) as any;
    const { threadId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check thread access
    const { data: thread, error: threadError } = await supabase
      .from("recruitment_threads")
      .select("applicant_id, post_owner_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.applicant_id !== user.id && thread.post_owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("recruitment_messages")
      .select("*, sender:profiles(username, avatar_url, in_game_name)")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 400 });
    }

    return NextResponse.json(messages);
  } catch (err: any) {
    console.error("GET /api/recruitment/threads/[threadId]/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = (await createClient()) as any;
    const { threadId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    // Check thread access & active status
    const { data: thread, error: threadError } = await supabase
      .from("recruitment_threads")
      .select("applicant_id, post_owner_id, is_active")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.applicant_id !== user.id && thread.post_owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!thread.is_active) {
      return NextResponse.json({ error: "Thread is no longer active" }, { status: 400 });
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from("recruitment_messages")
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content,
      })
      .select("*, sender:profiles(username, avatar_url, in_game_name)")
      .single();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 400 });
    }

    return NextResponse.json(message);
  } catch (err: any) {
    console.error("POST /api/recruitment/threads/[threadId]/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
